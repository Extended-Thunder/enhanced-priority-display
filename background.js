const EnhancedPriorityDisplay = {
  async migratePreferences() {
    const CURRENT_LEGACY_MIGRATION = 1;

    // Migrate legacy preferences to local storage.
    const { preferences } = await messenger.storage.local.get({
      preferences: {},
    });
    const currentMigrationNumber = preferences.migratedLegacy | 0;

    if (currentMigrationNumber == CURRENT_LEGACY_MIGRATION) return;

    const prefDefaults = await fetch("/default/preferences.json").then((ptxt) =>
      ptxt.json()
    );

    // Load legacy preferences
    if (currentMigrationNumber === 0) {
      // Merge any existing legacy preferences into the new storage system
      let prefKeys = [];
      let legacyValuePromises = [];

      // Load values from legacy storage, substitute defaults if not defined.
      for (let prefName of Object.getOwnPropertyNames(prefDefaults)) {
        prefKeys.push(prefName);
        let dtype = prefDefaults[prefName][0];
        let defVal = prefDefaults[prefName][1];
        let legacyKey = prefDefaults[prefName][2];
        let pp; // Promise that resolves to this preference value.
        const isquickopt = prefName.match(/quickOptions(\d)Label/);
        if (isquickopt) {
          const delayMins =
            +prefDefaults[`quickOptions${isquickopt[1]}Args`][1] | 0;
          const localizedDelayLabel = `${new Sugar.Date(
            Date.now() + 60000 * delayMins
          ).relative()}`;
          pp = new Promise((resolve, reject) => {
            resolve(localizedDelayLabel);
          });
        } else if (legacyKey === null) {
          pp = new Promise((resolve, reject) => resolve(defVal));
        } else {
          pp = messenger.ep_display.getLegacyPref(
            legacyKey,
            dtype,
            defVal.toString()
          );
        }
        legacyValuePromises.push(pp);
      }
      // Combine keys and legacy/default values back into a single object.
      let legacyPrefs = await Promise.all(legacyValuePromises).then(
        (legacyVals) => {
          return legacyVals.reduce((r, f, i) => {
            r[prefKeys[i]] = f;
            return r;
          }, {});
        }
      );

      SLStatic.info(
        "EnhancedPriorityDisplay: migrating legacy/default preferences."
      );

      // Merge legacy preferences into undefined preference keys
      prefKeys.forEach((key) => {
        if (preferences[key] === undefined) {
          preferences[key] = legacyPrefs[key];
        }
      });
    }

    // Pick up any new properties from defaults
    for (let prefName of Object.getOwnPropertyNames(prefDefaults)) {
      if (preferences[prefName] === undefined) {
        const prefValue = prefDefaults[prefName][1];
        SLStatic.debug(`Added new preference ${prefName}: ${prefValue}`);
        preferences[prefName] = prefValue;
      }
    }

    preferences.migratedLegacy = CURRENT_LEGACY_MIGRATION;

    await messenger.storage.local.set({ preferences });

    return currentMigrationNumber;
  },

  async init() {
    // Print version info
    const extensionName = messenger.i18n.getMessage("extensionName");
    const thisVersion = messenger.runtime.getManifest().version;
    const browserInfo = await messenger.runtime.getBrowserInfo();
    const platformInfo = await messenger.runtime.getPlatformInfo();
    console.info(
      `${extensionName} version ${thisVersion} on ` +
        `${browserInfo.name} ${browserInfo.version} (${browserInfo.buildID}) ` +
        `[${platformInfo.os} ${platformInfo.arch}]`
    );

    // Load extension
    messenger.ep_display.init();
  },
};

EnhancedPriorityDisplay.init();
