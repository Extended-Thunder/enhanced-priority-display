/* Copyright (c) 2021, Extended Thunder Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function translateDocument() {
    const elements = document.querySelectorAll(".localized");
    elements.forEach(async e => {
      try {
        const key = e.className.match(/__MSG_(.+)__/)[1];
        const mockArgs = [];
        let msg;
        do {
          msg = browser.i18n.getMessage(key,mockArgs);
          mockArgs.push("");
        } while(msg.indexOf(/\$\d/) !== -1);
        if (e.tagName === "INPUT" || e.tagName === "TEXTAREA") {
          e.value = msg;
        } else {
          e.textContent = msg;
        }
      } catch (err) {
        console.error("Localization error", err, e);
      }
    });
  }
  
  if (typeof browser === "undefined" || typeof browserMocking === "boolean") {
    // For testing purposes, because the browser mock script needs to
    // asynchronously load translations.
    function waitAndTranslate() {
      if (browser.i18n.getMessage("advancedOptionsTitle") === "advancedOptionsTitle") {
        setTimeout(waitAndTranslate, 10);
      } else {
        translateDocument();
      }
    }
    window.addEventListener("load", waitAndTranslate, false);
    // window.addEventListener("load", () =>
    //   setTimeout(translateDocument,150), false);
  } else {
    window.addEventListener("load", translateDocument, false);
  }
