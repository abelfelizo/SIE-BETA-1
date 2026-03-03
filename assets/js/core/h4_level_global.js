
// H4 - Global Level State (Beta 1)
window.SIE_STATE = window.SIE_STATE || {};
SIE_STATE.level = "pres";

function setLevel(level){
    SIE_STATE.level = level;
    if(typeof renderDashboardByLevel === "function"){
        renderDashboardByLevel(level);
    }
}
