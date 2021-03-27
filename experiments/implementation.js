const { utils: Cu, classes: Cc, interfaces: Ci } = Components;
const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

var ep_display = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      ep_display: {
        async init() {
          try {
            ExtensionSupport.registerWindowListener("epdWindowListener", {
              chromeURLs: [
                "chrome://messenger/content/messenger.xhtml",
                "chrome://messenger/content/messenger.xul",
              ],
              onLoadWindow(window) {
                EnhancedPriorityDisplay(context, window);
              },
            });
          } catch (exception) {
            console.error(exception);
          }
        },
        async getLegacyPref(name, dtype, defVal) {
          let prefDefault = defVal;
          let getter;
          Services.prefs.getLegacyPref

          switch (dtype) {
            case "bool": {
              prefDefault = (defVal === "true");
              getter = Services.prefs.getBoolPref;
              break;
            }
            case "int": {
              prefDefault = (Number(defVal) | 0);
              getter = Services.prefs.getIntPref;
              break;
            }
            case "char": {
              getter = Services.prefs.getCharPref;
              break;
            }
            case "string": {
              getter = Services.prefs.getStringPref;
              break;
            }
            default: {
              throw new Error("Unexpected pref type");
            }
          }

          try {
            const prefName = `extensions.EnhancedPriorityDisplay.${name}`;
            return getter(prefName, prefDefault);
          } catch (err) {
            console.error(err);
            return prefDefault;
          }
        }
      },
    };
  }

  close() {
    console.info("ep_display.close: Beginning close function.");
    // Stop listening for new message compose windows.
    try {
      ExtensionSupport.unregisterWindowListener("epdWindowListener");
    } catch (err) {
      console.warn(`Could not deregister listener <epdWindowListener>`,err);
    }

    // Invalidate the cache to ensure we start clean if extension is reloaded.
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);

    console.info("ep_display.close: Extension removed. Goodbye world.");
  }
};

function EnhancedPriorityDisplay(context, window) {

  function createColumnHandler(colId, oldHandler) {
    if (!window.gDBView)
      return;

    const isPriorityCol = (colId === "priorityCol");

    const columnHandler = {
      isEPDHandler: true,

      old: oldHandler,

      getCellText(row, col) {
        if (isPriorityCol && gBP("Iconify"))
          return "";
        else if (columnHandler.old)
          return columnHandler.old.getCellText(row, col);
        else
          return window.gDBView.cellTextForColumn(row, colId);
      },

      getSortStringForRow(hdr) {
        if (columnHandler.old)
          return columnHandler.old.getSortStringForRow(hdr);
        else
          return null;
      },

      isString() {
        if (isPriorityCol)
          return !gBP("Iconify");
        else if (columnHandler.old)
          return columnHandler.old.isString();
        else
          return true;
      },

      getPriorityLevel(row) {
        let hdr = window.gDBView.getMsgHdrAt(row);
        let priority = hdr.getStringProperty("priority");
        return priority;
      },

      getSelector(row, which) {
        var properties = "";
        switch (columnHandler.getPriorityLevel(row)) {
          case "6":
            if (gBP(which + "High"))
              properties = "enhanced-priority-display-highest";
            break;
          case "5":
            if (gBP(which + "High"))
              properties = "enhanced-priority-display-high";
            break;
          case "3":
            if (gBP(which + "Low"))
              properties = "enhanced-priority-display-low";
            break;
          case "2":
            if (gBP(which + "Low"))
              properties = "enhanced-priority-display-lowest";
            break;
        }
        return properties;
      },

      getCellProperties(row, col, props) {
        let properties = columnHandler.getSelector(row, "Style");
        if (columnHandler.old) {
          let oldProps = columnHandler.old.getCellProperties(row, col, props);
          if (oldProps)
            properties += (properties === "" ? "" : " ") + oldProps;
        }
        return properties;
      },

      getRowProperties(row, props) {
        let properties = columnHandler.getSelector(row, "Shade");
        if (columnHandler.old) {
          let oldProps = columnHandler.old.getRowProperties(row, col, props);
          if (oldProps)
            properties += (properties === "" ? "" : " ") + oldProps;
        }
        return properties;
      },

      getImageSrc(row, col) {
        if (isPriorityCol) {
          if (!gBP("Iconify"))
            return null;

          switch (columnHandler.getPriorityLevel(row)) {
            case "6":
              return getPrefURL("HighestIcon");
            case "5":
              return getPrefURL("HighIcon");
            case "4":
            case "3":
              return getPrefURL("LowIcon");
            case "2":
              return getPrefURL("LowestIcon");
            default:
              if (columnHandler.old)
                return columnHandler.old.getImageSrc(row, col);
              return null;
          }
        } else {
          if (columnHandler.old)
            return columnHandler.old.getImageSrc(row, col);
          return null;
        }
      },

      getSortLongForRow(hdr) {
        if (columnHandler.old)
          return columnHandler.old.getSortLongForRow(hdr);
        return null;
      },
    };

    window.gDBView.addColumnHandler(colId, columnHandler);
  }

  const dbObserver = {
    // Components.interfaces.nsIObserver
    observe(aMsgFolder, aTopic, aData) {
      if (!window.gDBView)
        return;

      let threadCols = window.document.getElementById("threadCols");
      if (!threadCols)
        return;

      let columns = threadCols.getElementsByTagName("treecol");
      if (!columns)
        return;

      for (let column in columns) {
        let id = columns[column].id;
        if (!id)
          continue;

        let handler;
        try {
          handler = window.gDBView.getColumnHandler(id);
        } catch (ex) {}

        if (handler && !handler.isString())
          continue;
        if (handler && handler.cycleCell)
          continue;
        if (!handler &&
            !id.match(/^(priority|subject|sender|recipient|received|date|size|tags|account|unread|total|location|status|correspondent)Col$/))
          continue;

        createColumnHandler(id, handler);
      }
    },
  };

  let preferences = {};

  function gBP(pref) {
    return preferences[pref];
  }

  function getURL(relPath) {
    return `moz-extension://${context.extension.uuid}/${relPath}`;
  }

  function getPrefURL(pref) {
    const relPath = preferences[pref];
    return getURL(relPath);
  }

  const AddonListener = {
    resetSession(addon, who) {
      if (addon.id === "EnhancedPriorityDisplay@kamens.us") {
        console.debug("AddonListener.resetSession: who - " + who);

        if (window.gDBView) {
          try {
            let threadCols = window.document.getElementById("threadCols");
            if (!threadCols)
              return;

            let columns = threadCols.getElementsByTagName("treecol");
            if (!columns)
              return;

            for (let column in columns) {
              let colId = columns[column].id;
              if (colId) {
                let handler = window.gDBView.getColumnHandler(colId);
                if (handler && handler.isEPDHandler) {
                  window.gDBView.removeColumnHandler(colId);
                  if (handler.old)
                    window.gDBView.addColumnHandler(colId, handler.old);
                }
              }
            }
          } catch (ex) {
            console.warn("Unable to remove column handlers", ex);
          }
        }

        try{
          Services.obs.removeObserver(dbObserver, "MsgCreateDBView");
        } catch (ex) { console.warn("Unable to remove msgcreatedbview observer", ex); }

        try {
          AddonManager.removeAddonListener(this);
        } catch (ex) { console.warn("Unable to remove addon listener", ex); }

        try {
          let oldStyle = window.document.getElementById('customStyle');
          if (oldStyle)
            oldStyle.remove();
        } catch (ex) { console.warn("Unable to remove stylesheet", ex); }
      }
    },
    onUninstalling(addon) {
      this.resetSession(addon, "onUninstalling");
    },
    onDisabling(addon) {
      this.resetSession(addon, "onDisabling");
    },
    // The listener is removed so these aren't run; they aren't needed as the
    // addon is installed by the addon system and runs our backgound.js loader.
    onInstalling(addon) {},
    onEnabling(addon) {},
    onOperationCancelled(addon) {},
  };

  function applyStyle() {
    let oldStyle = window.document.getElementById('customStyle');
    if (oldStyle)
      oldStyle.remove();

    let threadTree = window.document.getElementById('threadTree');
    if (threadTree) {
      let rules = [
        `#threadTree > treechildren::-moz-tree-cell-text(enhanced-priority-display-highest) {
          font-weight: bold;
          font-style: italic;
          font-size: 105%;
        }`,
        `#threadTree > treechildren::-moz-tree-cell-text(enhanced-priority-display-high) {
          font-style: italic;
          font-size: 105%;
        }`,
        `#threadTree > treechildren::-moz-tree-image(enhanced-priority-display-high) {
          opacity: 0.75;
        }`,
        `#threadTree > treechildren::-moz-tree-image(enhanced-priority-display-low),
         #threadTree > treechildren::-moz-tree-cell-text(enhanced-priority-display-low) {
          opacity: 0.5;
        }`,
        `#threadTree > treechildren::-moz-tree-image(enhanced-priority-display-lowest),
         #threadTree > treechildren::-moz-tree-cell-text(enhanced-priority-display-lowest) {
          opacity: 0.25;
        }`];

      for (let level of ['lowest', 'low', 'high', 'highest']) {
        let imgPath = `ui/graphics/background-${level}.png`;
        rules.push(`
          #threadTree > treechildren::-moz-tree-row(enhanced-priority-display-${level}) {
            background-image: url("${getURL(imgPath)}");
            background-size: auto;
            background-repeat: repeat;
          }`);
      }

      let style = window.document.createElement('style');
      style.setAttribute('id', 'customStyle');
      threadTree.parentElement.insertBefore(style, threadTree);
      for (let rule of rules) {
        style.sheet.insertRule(rule);
      }
    }
  }

  async function onLoad(context) {
    const storageAPI = context.apiCan.findAPIPath("storage.local");
    const storage = await storageAPI.callMethodInParentProcess(
        "get", [{ "preferences": {} }]
      );
    preferences = storage.preferences;

    applyStyle();

    Services.obs.addObserver(dbObserver, "MsgCreateDBView", false);
    AddonManager.addAddonListener(AddonListener);
  }

  onLoad(context);
}
