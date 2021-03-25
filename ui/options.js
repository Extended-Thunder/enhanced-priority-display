var EPDOptions = {
    idPrefix: "EnhancedPriorityDisplay-",
    prefBranch: null,
    mapping: [
        ["iconify-checkbox", "Iconify", "bool"],
        ["style-high-checkbox", "StyleHigh", "bool"],
        ["style-low-checkbox", "StyleLow", "bool"],
        ["shade-high-checkbox", "ShadeHigh", "bool"],
        ["shade-low-checkbox", "ShadeLow", "bool"],
        ["highest-icon-textbox", "HighestIcon", "string"],
        ["high-icon-textbox", "HighIcon", "string"],
        ["low-icon-textbox", "LowIcon", "string"],
        ["lowest-icon-textbox", "LowestIcon", "string"],
        ["dump-level-menu", "logging.dump", "char"],
        ["console-level-menu", "logging.console", "char"],
    ],

    LoadPrefs:  async function() {
        /*if (! EPDOptions.prefBranch) {
            var prefService =
                Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch);
            EPDOptions.prefBranch = prefService.getBranch(
              "extensions.EnhancedPriorityDisplay.");
        }*/
try{
        browser.epd_optAPI.LoadPrefs();

        EPDOptions.mapping.forEach(async function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(EPDOptions.idPrefix + elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                elt.value =  await browser.epd_optAPI.getIntPref(pref);
                break;
            case "bool":
                elt.checked = await browser.epd_optAPI.getBoolPref(pref);
                break;
            case "string":
                elt.value = await browser.epd_optAPI.getStringPref(pref);
                break;
            case "char":
                elt.value = await browser.epd_optAPI.getCharPref(pref);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });

    }
    catch(err){
        console.error(err);
    }
    },

    ValidatePrefs: function(event) {
        EPDOptions.mapping.forEach(function(mapping) {
            var elt_id = mapping[0];
            var elt = document.getElementById(EPDOptions.idPrefix + elt_id);
            var pref = mapping[1];
            var pref_type = mapping[2];
            var pref_func;
            switch (pref_type) {
            case "int":
                browser.epd_optAPI.setIntPref(pref, elt.value);
                break;
            case "bool":
                browser.epd_optAPI.setBoolPref(pref, elt.checked);
                break;
            case "string":
                browser.epd_optAPI.setStringPref(pref, elt.value);
                break;
            case "char":
                browser.epd_optAPI.setCharPref(pref, elt.value);
                break;
            default:
                throw new Error("Unrecognized pref type: " + pref_type);
            }
        });
        return true;
    },

    SetOnLoad: function() {
        loadUi_i18ncontent();
       var btnlndn= document.getElementById("btnlndon");
       var btnparis= document.getElementById("btnparis");
       var btnTokyo= document.getElementById("btntokyo");
       var btn_Save=document.getElementById("btn_Save");
       var btn_Cancel=document.getElementById("btn_Cancel");

       btnlndn.addEventListener("click",function(event) {openTab(event,"general");});
       btnparis.addEventListener("click",function(event) {openTab(event,"advanced");});
       btnTokyo.addEventListener("click",function(event) {openTab(event,"about");});
       window.removeEventListener("load", EPDOptions.SetOnLoad, false);
       btn_Cancel.addEventListener("click", function(event) {
            EPDOptions.LoadPrefs();
        });
        btn_Save.addEventListener("click", function(event) {
            if (! EPDOptions.ValidatePrefs())
                event.preventDefault();
        });
        openTab(event,"general");
        EPDOptions.LoadPrefs();
    },
};

window.addEventListener("load", EPDOptions.SetOnLoad, false);

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
  function loadUi_i18ncontent()
  {
    var lbl_iconify_ckbx=document.getElementById("lbl_iconify-checkbox");
    var lbl_style_high_ckbx=document.getElementById("lbl_style-high-checkbox");
    var lbl_style_low_ckbx=document.getElementById("lbl_style-low-checkbox");
    var lbl_shade_high_ckbx=document.getElementById("lbl_shade-high-checkbox");
    var lbl_shade_low_ckbx=document.getElementById("lbl_shade-low-checkbox");
    var lbl_highest_icon_txbx=document.getElementById("lbl_highest-icon-textbox");
    var lbl_high_icon_txbx=document.getElementById("lbl_low-icon-textbox");
    var lowest_icon_txbx=document.getElementById("lowest-icon-textbox");
    var opt_lglvldump=document.getElementById("Opt_lglvldump");
    var opt_lglvlconsole =document.getElementById("Opt_lglvlconsole");
    var lblinfo = document.getElementById("lblinfo");
    var lblcontact= document.getElementById("lblcontact");
    var lbldonate= document.getElementById("lbldonate");


    lbl_iconify_ckbx.value=browser.i18n.getMessage("iconify-checkbox");
    lbl_style_high_ckbx.value=browser.i18n.getMessage("style-high-checkbox");
    lbl_style_low_ckbx.value=browser.i18n.getMessage("style-low-checkbox");
    lbl_shade_high_ckbx.value=browser.i18n.getMessage("shade-high-checkbox");
    lbl_shade_low_ckbx.value=browser.i18n.getMessage("shade-low-checkbox");
    lbl_highest_icon_txbx.value=browser.i18n.getMessage("highest-icon-textbox");
    lbl_high_icon_txbx.value=browser.i18n.getMessage("high-icon-textbox");
    lowest_icon_txbx.value=browser.i18n.getMessage("low-icon-textbox");
    opt_lglvldump.value=browser.i18n.getMessage("Opt_logleveldump");
    opt_lglvlconsole.value=browser.i18n.getMessage("Opt_loglevelconsole");
    lblinfo.innerHTML=browser.i18n.getMessage("copyright.label")+"<br>"+browser.i18n.getMessage("license.label")+"<br>"
            + browser.i18n.getMessage("support.label")+"<br>";
    lblcontact.innerHTML=browser.i18n.getMessage("contact.label");
    lbldonate.innerHTML=browser.i18n.getMessage("donate.label");
    //lblcontact.href="mailto:jik+epd@kamens.us?subject=Enhanced%20Priority%20Display"
    //lbldonate.href="https://addons.mozilla.org/thunderbird/addon/enhanced-priority-display/contribute/roadblock/?src=prefwindow"
    //lblcontact.setAttribute("href", "mailto:jik+epd@kamens.us?subject=Enhanced%20Priority%20Display");
   // lbldonate.setAttribute("href", "https://addons.mozilla.org/thunderbird/addon/enhanced-priority-display/contribute/roadblock/?src=prefwindow");




  }