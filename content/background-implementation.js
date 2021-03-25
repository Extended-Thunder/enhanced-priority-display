var { ExtensionCommon } = ChromeUtils.import(
  "resource://gre/modules/ExtensionCommon.jsm"
);
var { ExtensionParent } = ChromeUtils.import(
  "resource://gre/modules/ExtensionParent.jsm"
);

//var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
//var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

var extension = ExtensionParent.GlobalManager.getExtension(
  "EnhancedPriorityDisplay@kamens.us"
);
var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);
var idPrefix = "EnhancedPriorityDisplay-";
let window = Services.wm.getMostRecentWindow("mail:3pane");

var epd_bgrndAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      epd_bgrndAPI: {
        Epdicons_apply: function () {
          try {
            enhancedPriorityDisplayIcons(context);
          } catch (exception) {
            console.error(exception);
          }
        },
      },
    };
  }
};

function enhancedPriorityDisplayIcons(context) {
  let { extension } = context;
  // Current Thunderbird nightly builds do not load default preferences
  // from overlay add-ons. They're probably going to fix this, but it may go
  // away again at some point in the future, and in any case we'll need to do
  // it ourselves when we convert from overlay to bootstrapped, and there
  // shouldn't be any harm in setting the default values of preferences twice
  // (i.e., both Thunderbird and our code doing it).
  var { DefaultPreferencesLoader } = ChromeUtils.import(
    extension.rootURI.resolve("content/defaultPreferencesLoader.js")
  );
  var loader = new DefaultPreferencesLoader();
  loader.parseUri(extension.rootURI.resolve("prefs.jsm"));
  var oldColumnHandler;
  /* var logger = Log4Moz
	.getConfiguredLogger("extensions.EnhancedPriorityDisplay",
			     Log4Moz.Level.Trace,
			     Log4Moz.Level.Info,
			     Log4Moz.Level.Debug);*/
  var prefService = Components.classes[
    "@mozilla.org/preferences-service;1"
  ].getService(Components.interfaces.nsIPrefBranch);

  function gCP(pref) {
    return prefService.getCharPref(
      "extensions.EnhancedPriorityDisplay." + pref
    );
  }

  function gBP(pref) {
    return prefService.getBoolPref(
      "extensions.EnhancedPriorityDisplay." + pref
    );
  }

  function priorityIconsOnLoad() {
    var ObserverService = Components.classes[
      "@mozilla.org/observer-service;1"
    ].getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(createDbObserver, "MsgCreateDBView", false);

    console.log("called from priorityIconsOnLoad");
  }
  var observer = function () {
    priorityIconsOnLoad();
  };
  function createGenericHandler(colId, oldHandler) {
    if (window.gDBView) {
      var tree = window.document.getElementById("threadTree");
      var columnHandler = {
        old: oldHandler,

        getCellText: function (row, col) {
          if (columnHandler.old) return columnHandler.old.getCellText(row, col);
          return window.gDBView.cellTextForColumn(row, colId);
        },

        getSortStringForRow: function (hdr) {
          if (columnHandler.old)
            return columnHandler.old.getSortStringForRow(hdr);
          return null;
        },

        isString: function () {
          return true;
        },

        _atoms: {},
        hasAtoms: true,
        _getAtom: function (aName) {
          if (!this.hasAtoms) return null;
          if (!this._atoms[aName]) {
            try {
              var as = Components.classes[
                "@mozilla.org/atom-service;1"
              ].getService(Components.interfaces.nsIAtomService);
            } catch (ex) {
              this.hasAtoms = false;
              return null;
            }
            this._atoms[aName] = as.getAtom(aName);
          }
          return this._atoms[aName];
        },

        setProperty: function (prop, value) {
          if (prop) {
            prop.AppendElement(this._getAtom(value));
            return "";
          } else {
            return " " + value;
          }
        },

        getExtensionProperties: function (row, props, which) {
          var properties = "";
          var hdr = window.gDBView.getMsgHdrAt(row);
          var priority = hdr.getStringProperty("priority");
          var doHigh = gBP(which + "High");
          var doLow = gBP(which + "Low");
          var property;
          switch (priority) {
            case "6":
              if (doHigh) property = "enhanced-priority-display-highest";
              break;
            case "5":
              if (doHigh) property = "enhanced-priority-display-high";
              break;
            case "3":
              if (doLow) property = "enhanced-priority-display-low";
              break;
            case "2":
              if (doLow) property = "enhanced-priority-display-lowest";
              break;
          }
          if (property) properties += this.setProperty(props, property);

          console.log(properties);
          return properties;
        },

        getCellProperties: function (row, col, props) {
          properties = columnHandler.getExtensionProperties(
            row,
            props,
            "Style"
          );
          if (columnHandler.old)
            properties += columnHandler.old.getCellProperties(row, col, props);
          return properties;
        },

        getRowProperties: function (row, props) {
          if (tree.view.selection.isSelected(row)) {
            return "";
          }
          properties = columnHandler.getExtensionProperties(
            row,
            props,
            "Shade"
          );
          if (columnHandler.old)
            properties += columnHandler.old.getRowProperties(row, props);
          return properties;
        },

        getImageSrc: function (row, col) {
          if (columnHandler.old) return columnHandler.old.getImageSrc(row, col);
          return null;
        },

        getSortLongForRow: function (hdr) {
          if (columnHandler.old)
            return columnHandler.old.getSortLongForRow(hdr);
          return null;
        },
      };

      window.gDBView.addColumnHandler(colId, columnHandler);
    }
  }

  var createDbObserver = {
    // Components.interfaces.nsIObserver
    observe: function (aMsgFolder, aTopic, aData) {
      console.log("called from observe");
      if (window.gDBView) {
        console.log("window.gDBView-------------true");
        var tree = window.document.getElementById("threadTree");
        var columnHandler = {
          getCellText: function (row, col) {
            if (gBP("Iconify")) return "";
            return window.gDBView.cellTextForColumn(row, "priorityCol");
          },

          getSortStringForRow: function (hdr) {
            if (columnHandler.old)
              return columnHandler.old.getSortStringForRow(hdr);
            return null;
          },

          isString: function () {
            return !gBP("Iconify");
          },

          _atoms: {},
          hasAtoms: true,
          _getAtom: function (aName) {
            if (!this.hasAtoms) return null;
            if (!this._atoms[aName]) {
              try {
                var as = Components.classes[
                  "@mozilla.org/atom-service;1"
                ].getService(Components.interfaces.nsIAtomService);
              } catch (ex) {
                hasAtoms = false;
                return null;
              }
              this._atoms[aName] = as.getAtom(aName);
            }
            return this._atoms[aName];
          },

          setProperty: function (prop, value) {
            if (prop) {
              prop.AppendElement(this._getAtom(value));
              return "";
            } else {
              return " " + value;
            }
          },

          getExtensionProperties: function (row, props, which) {
            console.log("called from getExtensionProperties");
            var properties = "";
            var hdr = window.gDBView.getMsgHdrAt(row);
            var priority = hdr.getStringProperty("priority");
            var doHigh = gBP(which + "High");
            var doLow = gBP(which + "Low");
            var property;
            switch (priority) {
              case "6":
                if (doHigh) property = "enhanced-priority-display-highest";
                break;
              case "5":
                if (doHigh) property = "enhanced-priority-display-high";
                break;
              case "3":
                if (doLow) property = "enhanced-priority-display-low";
                break;
              case "2":
                if (doLow) property = "enhanced-priority-display-lowest";
                break;
            }
            if (property) properties += this.setProperty(props, property);
            return properties;
          },

          getCellProperties: function (row, col, props) {
            properties = columnHandler.getExtensionProperties(
              row,
              props,
              "Style"
            );
            if (columnHandler.old)
              properties += columnHandler.old.getCellProperties(row, props);
            return properties;
          },

          getRowProperties: function (row, props) {
            if (tree.view.selection.isSelected(row)) {
              return "";
            }
            properties = columnHandler.getExtensionProperties(
              row,
              props,
              "Shade"
            );
            if (columnHandler.old)
              properties += columnHandler.old.getRowProperties(row, props);
            return properties;
          },

          getImageSrc: function (row, col) {
            console.log("called from getExtensionProperties");
            if (!gBP("Iconify")) return null;
            try {
              var hdr = window.gDBView.getMsgHdrAt(row);
            } catch (ex) {
              return null;
            }
            var priority = hdr.getStringProperty("priority");
            switch (priority) {
              case "6":
                return gCP("HighestIcon");
              case "5":
                return gCP("HighIcon");
              case "3":
                return gCP("LowIcon");
              case "2":
                return gCP("LowestIcon");
              default:
                if (columnHandler.old)
                  return columnHandler.old.getImageSrc(row, col);
                return null;
            }
          },

          getSortLongForRow: function (hdr) {
            if (columnHandler.old)
              return columnHandler.old.getSortLongForRow(hdr);
            return null;
          },
        };

        try {
          columnHandler.old = window.gDBView.getColumnHandler("priorityCol");
        } catch (ex) {}
        window.gDBView.addColumnHandler("priorityCol", columnHandler);
        var threadCols = window.document.getElementById("threadCols");
        console.log(threadCols);
        if (!threadCols) return;
        var columns = threadCols.getElementsByTagName("treecol");
        if (!columns) return;
        for (var column in columns) {
          var id = columns[column].id;
          if (!id) continue;
          var handler;
          try {
            handler = window.gDBView.getColumnHandler(id);
          } catch (ex) {}
          if (handler && !handler.isString()) continue;
          if (handler && handler.cycleCell) continue;
          if (
            !handler &&
            !id.match(
              /^(subject|sender|recipient|received|date|size|tags|account|unread|total|location|status)Col$/
            )
          )
            continue;
          createGenericHandler(id, handler);
        }
      }
    },
  };
  //Services.obs.addObserver(observer, "load", false);
  // window.addEventListener("load", priorityIconsOnLoad, false);
  // window.addEventListener("unload", priorityIconsOnUnload, false);

  ExtensionSupport.registerWindowListener("epdWindowListener", {
    chromeURLs: [
      "chrome://messenger/content/messenger.xhtml",
      "chrome://messenger/content/messenger.xul",
    ],
    onLoadWindow(/*window*/) {
      priorityIconsOnLoad();
    },
  });
}
