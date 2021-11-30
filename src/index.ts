import axios from "axios";
import {
  addBlockCommand,
  getBasicTreeByParentUid,
  getChildrenLengthByPageUid,
  getCurrentPageUid,
  getPageTitleByBlockUid,
  getPageTitleByPageUid,
  registerSmartBlocksCommand,
  runExtension,
  toRoamDateUid,
} from "roam-client";
import {
  createConfigObserver,
  getSettingValueFromTree,
  getSubTree,
  toFlexRegex,
} from "roamjs-components";
import {
  DEFAULT_LABEL,
  DEFAULT_TEMPLATE,
  importSpeech,
  render,
} from "./components/ImportOtterDialog";

const CONFIG = `roam/js/otter`;

runExtension("otter", () => {
  const { pageUid } = createConfigObserver({
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
              defaultValue: DEFAULT_LABEL,
            },
            {
              type: "text",
              title: "template",
              description:
                "The format each Otter note/transcript uses on import",
              defaultValue: DEFAULT_TEMPLATE,
            },
            {
              type: "flag",
              title: "auto import",
              description:
                "Automatically imports the latest recording when checked",
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
    callback: (blockUid) => render({ blockUid, pageUid }),
  });

  const autoImportRecordings = (parentUid: string, onSuccess?: () => void) => {
    const email = getSettingValueFromTree({ tree, key: "email" });
    const password = getSettingValueFromTree({ tree, key: "password" });
    const label = getSettingValueFromTree({ tree, key: "label" });
    const template = getSettingValueFromTree({ tree, key: "template" });
    return axios
      .post<{speeches:{ id: string }[]}>(`${process.env.API_URL}/otter`, {
        email,
        password,
        operation: "GET_SPEECHES",
      })
      .then((r) => {
        const { children: idsChildren } = getSubTree({
          parentUid: pageUid,
          key: "ids",
        });
        const importedIds = new Set(idsChildren.map((t) => t.text));
        return Promise.all(
          r.data.speeches
            .filter((s) => !importedIds.has(s.id))
            .map((s) =>
              importSpeech({
                credentials: { email, password },
                id: s.id,
                label,
                template,
                onSuccess,
                configUid: pageUid,
                parentUid,
                order: getChildrenLengthByPageUid(parentUid),
              })
            )
        ).then((r) => r.flat());
      });
  };

  const tree = getBasicTreeByParentUid(pageUid);
  if (tree.some((t) => toFlexRegex("auto import").test(t.text))) {
    autoImportRecordings(toRoamDateUid(new Date()), () => console.log("done!"));
  }

  registerSmartBlocksCommand({
    text: "OTTER",
    handler: (context: { targetUid: string }) => () =>
      autoImportRecordings(
        getPageTitleByBlockUid(context.targetUid) ||
          getPageTitleByPageUid(context.targetUid)
      ),
  });
});
