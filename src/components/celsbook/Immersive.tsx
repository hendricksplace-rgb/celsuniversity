// The CelsUS reader, quiz and completion screens bring their own top bar and buttons: the student area's
// header and phone tab bar (AppShell, [data-prefs]) step aside while one of them is on screen.
const CSS = "[data-prefs]>header,[data-prefs]>nav{display:none}[data-prefs]>main{max-width:none;padding:0}";

export function Immersive() {
  return <style>{CSS}</style>;
}
