/* Copyright (c) 2021,2022 Extended Thunder Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

var ep_prefs = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      ep_prefs: {
        async getLegacyPref(name, dtype, defVal) {
          const prefName = `extensions.EnhancedPriorityDisplay.${name}`;

          let getter;
          switch (dtype) {
            case "bool": {
              defVal = (defVal === "true");
              getter = Services.prefs.getBoolPref;
              break;
            }
            case "int": {
              defVal = (Number(defVal) | 0);
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
            let value = getter(prefName, defVal);
            return value;
          } catch (err) {
            console.error(err);
            return prefDefault;
          }
        },

        async setLegacyPref(name, dtype, value) {
          const prefName = `extensions.EnhancedPriorityDisplay.${name}`;

          try {
            switch (dtype) {
              case "bool": {
                let prefValue = (value === "true");
                Services.prefs.setBoolPref(prefName, prefValue);
                return true;
              }
              case "int": {
                let prefValue = (Number(defVal) | 0);
                Services.prefs.setIntPref(prefName, prefValue);
                return true;
              }
              case "char": {
                Services.prefs.setCharPref(prefName, value);
                return true;
              }
              case "string": {
                Services.prefs.setStringPref(prefName, value);
                return true;
              }
              default: {
                throw new Error("Unexpected pref type");
              }
            }
          } catch (err) {
            console.error(err);
            return false;
          }
        }
      },
    };
  }
}
