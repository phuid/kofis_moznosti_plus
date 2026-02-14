console.log("kofi moznosti + start");

const labels = document.getElementsByTagName("label");

labels.filter((l) => {
  console.log(l.getAttribute("for"))
  return typeof l.getAttribute("for") == "string" && l.getAttribute("for").substring(0, 9) == "labelauty";
});

for (const l of labels) {
  l.style.backgroundColor = "red";
}