const EPD = {
  async getPref(key, dtype, defaultVal) {
    return await messenger.ep_prefs.getLegacyPref(key, dtype, defaultVal.toString());
  },
  async setPref(key, dtype, value) {
    return await messenger.ep_prefs.setLegacyPref(key, dtype, value.toString());
  },
  async loadPreferences() {
    const prefDefaults = await fetch("/default/preferences.json").then((ptxt) =>
      ptxt.json()
    );

    let preferences = {};

    for (let key of Object.getOwnPropertyNames(prefDefaults)) {
      let dtype = prefDefaults[key][0];
      let defaultVal = prefDefaults[key][1];

      // If the value is already set, this function will return the
      // current value, otherwise it automatically returns the default.
      let value = await EPD.getPref(key, dtype, defaultVal);
      let success = await EPD.setPref(key, dtype, value);
      if (success !== true)
        console.warn(`Unable to set preference: ${key}`);

      preferences[key] = value;
    }

    messenger.storage.local.set({ preferences });
  },

  async showVersionInfo() {
    const extensionName = messenger.i18n.getMessage("appName");
    const thisVersion = messenger.runtime.getManifest().version;
    const browserInfo = await messenger.runtime.getBrowserInfo();
    const platformInfo = await messenger.runtime.getPlatformInfo();
    console.info(
      `${extensionName} version ${thisVersion} on ` +
        `${browserInfo.name} ${browserInfo.version} (${browserInfo.buildID}) ` +
        `[${platformInfo.os} ${platformInfo.arch}]`
    );
  },

  async init() {
    this.showVersionInfo();
    await this.loadPreferences();

    // Load extension
    messenger.ep_display.init();
  }
};

EPD.init().then(() => {
  messenger.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "local") {
      console.log("Propagating changes from local storage back to legacy storage")

      const { preferences } = await messenger.storage.local.get({ preferences: {} });

      for (let key of Object.getOwnPropertyNames(preferences)) {
        let value = preferences[key];
        let dtype;
        switch (typeof value) {
          case "boolean":
            dtype = 'bool';
            break;
          case "number":
            dtype = ((value%1.0) == 0.0) ? 'int' : 'char';
            break;
          default:
            dtype = 'char';
        }
        EPD.setPref(key, dtype, value.toString());
      }
    }
  });
});
