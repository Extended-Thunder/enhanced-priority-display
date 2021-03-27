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
    /*"console-level-menu": "LogConsole"*/
  },

  checkboxGroups: {},

  async prefUpdatedListener(event) {
    // Respond to changes in UI input fields
    const element = event.target;
    const pref = EPDOptions.mapping[element.id];
    browser.storage.local.get({ preferences: {} }).then(async ({ preferences }) => {
      let affected = [element];
      if (element.type === "checkbox" || element.type === "radio") {
        preferences[pref] = element.checked;
        console.info(`Set option (radio) ${element.id}: ${element.checked}`);
        if (element.checked && EPDOptions.checkboxGroups[element.id])
          for (const id2 of EPDOptions.checkboxGroups[element.id]) {
            const element2 = document.getElementById(id2);
            let pref2 = EPDOptions.mapping[id2];
            if (element2.checked) {
              element2.checked = false;
              preferences[pref2] = false;
              console.info(`Set option (radio) ${id2}: false`);
              affected.push(element2);
            }
          }
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

  // // Currently unused
  // exclusiveCheckboxSet(ids) {
  //   // Creates a set of checkbox elements in which a maximum of
  //   // one item can be selected at any time.
  //   ids.forEach(id1 => {
  //     EPDOptions.checkboxGroups[id1] = [];
  //     ids.forEach(id2 => {
  //       if (id1 !== id2)
  //       EPDOptions.checkboxGroups[id1].push(id2);
  //     });
  //   });
  // },

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

function openTab(evt, tabname) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabname).style.display = "block";
  evt.currentTarget.className += " active";
}
function loadUi_i18ncontent() {
  var lbl_iconify_ckbx = document.getElementById("lbl_iconify-checkbox");
  var lbl_style_high_ckbx = document.getElementById("lbl_style-high-checkbox");
  var lbl_style_low_ckbx = document.getElementById("lbl_style-low-checkbox");
  var lbl_shade_high_ckbx = document.getElementById("lbl_shade-high-checkbox");
  var lbl_shade_low_ckbx = document.getElementById("lbl_shade-low-checkbox");
  var lbl_highest_icon_txbx = document.getElementById(
    "lbl_highest-icon-textbox"
  );
  var lbl_high_icon_txbx = document.getElementById("lbl_low-icon-textbox");
  var lowest_icon_txbx = document.getElementById("lowest-icon-textbox");
  var opt_lglvldump = document.getElementById("Opt_lglvldump");
  var opt_lglvlconsole = document.getElementById("Opt_lglvlconsole");
  var lblinfo = document.getElementById("lblinfo");
  var lblcontact = document.getElementById("lblcontact");
  var lbldonate = document.getElementById("lbldonate");

  lbl_iconify_ckbx.value = browser.i18n.getMessage("iconify-checkbox");
  lbl_style_high_ckbx.value = browser.i18n.getMessage("style-high-checkbox");
  lbl_style_low_ckbx.value = browser.i18n.getMessage("style-low-checkbox");
  lbl_shade_high_ckbx.value = browser.i18n.getMessage("shade-high-checkbox");
  lbl_shade_low_ckbx.value = browser.i18n.getMessage("shade-low-checkbox");
  lbl_highest_icon_txbx.value = browser.i18n.getMessage("highest-icon-textbox");
  lbl_high_icon_txbx.value = browser.i18n.getMessage("high-icon-textbox");
  lowest_icon_txbx.value = browser.i18n.getMessage("low-icon-textbox");
  opt_lglvldump.value = browser.i18n.getMessage("Opt_logleveldump");
  opt_lglvlconsole.value = browser.i18n.getMessage("Opt_loglevelconsole");
  lblinfo.innerHTML =
    browser.i18n.getMessage("copyright.label") +
    "<br>" +
    browser.i18n.getMessage("license.label") +
    "<br>" +
    browser.i18n.getMessage("support.label") +
    "<br>";
  lblcontact.innerHTML = browser.i18n.getMessage("contact.label");
  lbldonate.innerHTML = browser.i18n.getMessage("donate.label");
}

window.addEventListener("load", EPDOptions.onLoad, false);
