/* Copyright (c) 2021,2022 Extended Thunder Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

var { utils: Cu, classes: Cc, interfaces: Ci } = Components;
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

var ep_display = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      ep_display: {
        async init() {
          try {
            ExtensionSupport.registerWindowListener("epdWindowListener", {
              chromeURLs: [ "chrome://messenger/content/messenger.xhtml",
                            "chrome://messenger/content/messenger.xul" ],
              onLoadWindow(window) {
                EnhancedPriorityDisplay(context, window);
              }
            });
          } catch (exception) {
            console.error(exception);
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


/*
Function to execute on load for any new messenger window.
*/
function EnhancedPriorityDisplay(context, window) {

  function getBoolPref(pref) {
    pref = `extensions.EnhancedPriorityDisplay.${pref}`;
    return Services.prefs.getBoolPref(pref, undefined);
  }

  function getUriPref(pref) {
    pref = `extensions.EnhancedPriorityDisplay.${pref}`;
    let path = Services.prefs.getCharPref(pref);
    path = path.replace("chrome://EnhancedPriorityDisplay/", "");
    let uri = Services.io.newURI(path, null, context.extension.rootURI);
    return uri.spec;
  }

  function createColumnHandler(colId, oldHandler) {
    if (!window.gDBView)
      return;

    const isPriorityCol = (colId === "priorityCol");

    const columnHandler = {
      isEPDHandler: true,

      old: oldHandler,

      getCellText(row, col) {
        if (isPriorityCol && getBoolPref("Iconify"))
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
          return !getBoolPref("Iconify");
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
            if (getBoolPref(which + "High"))
              properties = "enhanced-priority-display-highest";
            break;
          case "5":
            if (getBoolPref(which + "High"))
              properties = "enhanced-priority-display-high";
            break;
          case "4":
            break;
          case "3":
            if (getBoolPref(which + "Low"))
              properties = "enhanced-priority-display-low";
            break;
          case "2":
            if (getBoolPref(which + "Low"))
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
          if (!getBoolPref("Iconify"))
            return null;

          switch (columnHandler.getPriorityLevel(row)) {
            case "6":
              return getUriPref("HighestIcon");
            case "5":
              return getUriPref("HighIcon");
            case "3":
              return getUriPref("LowIcon");
            case "2":
              return getUriPref("LowestIcon");
            default: // also "4", which is normal priority
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
          font-style: italic;
          font-size: 110%;
        }`,
        `#threadTree > treechildren::-moz-tree-cell-text(enhanced-priority-display-high) {
          font-style: italic;
          font-size: 105%;
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
        let imgUrl = `moz-extension://${context.extension.uuid}/${imgPath}`
        rules.push(`
          #threadTree > treechildren::-moz-tree-row(enhanced-priority-display-${level}) {
            background-image: url("${imgUrl}");
            background-size: auto;
            background-repeat: repeat;
          }`);
      }

      let style = window.document.createElement('style');
      style.setAttribute('id', 'customStyle');
      window.document.documentElement.appendChild(style);
      threadTree.parentElement.insertBefore(style, threadTree);
      for (let rule of rules) {
        style.sheet.insertRule(rule);
      }
    }
  }

  async function onLoad() {
    applyStyle();
    Services.obs.addObserver(dbObserver, "MsgCreateDBView", false);
    AddonManager.addAddonListener(AddonListener);
  }

  onLoad();
}
