export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("survey-theme");if(t==="dark"||t==="lavender-mist"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
