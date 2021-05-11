import { createConfigObserver } from "roamjs-components";
import { render } from "./components/ImportOtterDialog";

const CONFIG = `roam/js/otter`;

createConfigObserver({
  title: CONFIG,
  config: {
    tabs: [
      {
        fields: [
          {
            type: "text",
            title: "email",
            description: "The email tied to your Otter account",
          },
          {
            type: "text",
            title: "password",
            description: "The password needed to access your Otter account",
          },
        ],
        id: "home",
      },
    ],
  },
});

window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: "Import Otter",
  callback: () => render({}),
});
