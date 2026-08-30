/**
 * Определение Windows для ссылки на установщик.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else {
    global.ProfzorPlatform = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SETUP_ZIP =
    "https://github.com/svethina/ProfZOR/releases/download/v1.0-trial/ProfZOR-Setup.zip";

  function isWindowsClient(nav) {
    nav = nav || (typeof navigator !== "undefined" ? navigator : null);
    if (!nav) return false;
    try {
      var data = nav.userAgentData;
      if (data && typeof data.platform === "string" && data.platform) {
        return String(data.platform).toLowerCase() === "windows";
      }
    } catch (err) {}
    var ua = String(nav.userAgent || "");
    var plat = String(nav.platform || "");
    if (/Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)) return false;
    return /Win(?:dows|32|64)|WOW64/i.test(plat + " " + ua);
  }

  return {
    SETUP_ZIP: SETUP_ZIP,
    isWindowsClient: isWindowsClient,
  };
});
