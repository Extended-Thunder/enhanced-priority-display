var OptionTools = {
  // Apply stored value to UI element
  applyValue(id, value) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(id, element, value);
    } else {
      if (element.tagName === "INPUT") {
        switch (element.type) {
          case "checkbox":
            element.checked = value !== undefined && value;
            break;
          case "text":
          case "number":
            element.value = value !== undefined ? value : "";
            break;
          case "radio":
            element.checked = value !== undefined && element.value === value;
            break;
          default:
            console.error("EPDisplay: Unable to populate input element of type " + element.type);
        }
      } else if (element.tagName === "SELECT") {
        console.debug(`Applying stored default ${element.id}: ${value}`);
        const matchingChildren = [...element.childNodes].filter(
          (opt) =>
            opt.tagName === "OPTION" &&
            opt.value.toLowerCase() === value.toLowerCase()
        );
        if (matchingChildren.length === 1) {
          element.value = matchingChildren[0].value;
        } else if (matchingChildren.length > 1) {
            console.log("[EPDisplay]: Multiple options match", value, element);
        } else {
            console.log("[EPDisplay]: Could not find value in element ", value, element);
        }
      }
    }
  },

  async applyPrefsToUI(mapping) {
    // Sets all UI element states from stored preferences
    return await browser.storage.local.get({
        preferences: {}
    }).then(({ preferences }) => {
        Object.keys(mapping).forEach(dom_id => {
            const pref = mapping[dom_id];
            OptionTools.applyValue(dom_id, preferences[pref]);
        });
    });
  },

  showCheckMark(element, color) {
    // Appends a green checkmark as element's last sibling. Disappears after a
    // timeout (1.5 sec). If already displayed, then restart timeout.
    if (!color) {
      color = "green";
    }
    const checkmark = document.createElement("span");
    checkmark.textContent = String.fromCharCode(0x2714);
    checkmark.style.color = color;
    checkmark.className = "success_icon";

    const p = element.parentNode;
    if (p.lastChild.className === 'success_icon') {
        p.replaceChild(checkmark, p.lastChild);
    } else {
        p.appendChild(checkmark);
    }
    setTimeout(() => checkmark.remove(), 1500);
  },

  showXMark(element, color) {
    // Appends a ballot X as element's last sibling. Disappears after a
    // timeout (1.5 sec). If already displayed, then restart timeout.
    if (!color) {
      color = "red";
    }
    const marker = document.createElement("span");
    marker.textContent = String.fromCharCode(0x2718);
    marker.style.color = color;
    marker.className = "success_icon";

    const p = element.parentNode;
    if (p.lastChild.className === 'success_icon') {
        p.replaceChild(marker, p.lastChild);
    } else {
        p.appendChild(marker);
    }
    setTimeout(() => marker.remove(), 1500);
  },
};

var EPDOptions = {
  mapping: {
    "iconify-checkbox": "Iconify",
    "style-high-checkbox": "StyleHigh",
    "style-low-checkbox": "StyleLow",
    "shade-high-checkbox": "ShadeHigh",
    "shade-low-checkbox": "ShadeLow",
    "highest-icon-textbox": "HighestIcon",
    "high-icon-textbox": "HighIcon",
    "low-icon-textbox": "LowIcon",
    "lowest-icon-textbox": "LowestIcon"
  },

  async prefUpdatedListener(event) {
    // Respond to changes in UI input fields
    const element = event.target;
    const pref = EPDOptions.mapping[element.id];
    browser.storage.local.get({ preferences: {} }).then(async ({ preferences }) => {
      let affected = [element];
      if (element.type === "checkbox" || element.type === "radio") {
        preferences[pref] = element.checked;
        console.info(`Set option (radio) ${element.id}: ${element.checked}`);
      } else {
        let id = element.id;
        let value = element.value;
        console.info(`Set option (${element.type}) ${id}: ${preferences[pref]} -> ${value}`);
        preferences[pref] = value;
      }
      await browser.storage.local.set({ preferences });
      for (let el of affected) {
        OptionTools.showCheckMark(el, "green");
      }
    }).catch(ex => {
      console.error(ex);
      OptionTools.showXMark(element, "red");
    });
  },

  onLoad() {
    const mapping = EPDOptions.mapping;
    OptionTools.applyPrefsToUI(mapping).then(() => {
      Object.keys(mapping).forEach(id => {
        try {
          const el = document.getElementById(id);
          el.addEventListener("change", EPDOptions.prefUpdatedListener);
        } catch (ex) {
          console.error(ex);
        }
      });
    }).catch(console.error);
  }
};

window.addEventListener("load", EPDOptions.onLoad, false);
