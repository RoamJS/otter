import { addBlockCommand, runExtension } from "roam-client";
import { createConfigObserver } from "roamjs-components";
import { render } from "./components/ImportOtterDialog";

const CONFIG = `roam/js/otter`;

runExtension("otter", () => {
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
            {
              type: "text",
              title: "label",
              description: "The format labels use on import",
            },
            {
              type: "text",
              title: "template",
              description:
                "The format each Otter note/transcript uses on import",
            },
          ],
          id: "home",
        },
      ],
      versioning: true,
    },
  });

  addBlockCommand({
    label: "Import Otter",
    callback: (blockUid) => render({ blockUid }),
  });
});
