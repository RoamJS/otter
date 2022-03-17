import addBlockCommand from "roamjs-components/dom/addBlockCommand";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getChildrenLengthByPageUid from "roamjs-components/queries/getChildrenLengthByPageUid";
import getPageTitleByBlockUid from "roamjs-components/queries/getPageTitleByBlockUid";
import getPageTitleByPageUid from "roamjs-components/queries/getPageTitleByPageUid";
import registerSmartBlocksCommand from "roamjs-components/util/registerSmartBlocksCommand";
import runExtension from "roamjs-components/util/runExtension";
import { createConfigObserver } from "roamjs-components/components/ConfigPage";
import getSettingValueFromTree from "roamjs-components/util/getSettingValueFromTree";
import getSubTree from "roamjs-components/util/getSubTree";
import toFlexRegex from "roamjs-components/util/toFlexRegex";
import {
  DEFAULT_LABEL,
  DEFAULT_TEMPLATE,
  importSpeech,
  render,
} from "./components/ImportOtterDialog";
import PasswordField from "./components/PasswordField";
import localStorageGet from "roamjs-components/util/localStorageGet";
import deleteBlock from "roamjs-components/writes/deleteBlock";
import { render as renderSimpleAlert } from "roamjs-components/components/SimpleAlert";
import apiPost from "roamjs-components/util/apiPost";
import { render as renderToast } from "roamjs-components/components/Toast";
import { Intent } from "@blueprintjs/core";
import toRoamDate from "roamjs-components/date/toRoamDate";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";

const CONFIG = `roam/js/otter`;

runExtension("otter", async () => {
  const { pageUid } = await createConfigObserver({
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
              type: "custom",
              title: "password",
              description: "The password needed to access your Otter account",
              options: {
                component: PasswordField,
              },
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

  const tree = getBasicTreeByParentUid(pageUid);
  const passwordNode = getSubTree({ tree, key: "password" });
  if (!localStorageGet("otter-password") && !!passwordNode.children.length) {
    renderSimpleAlert({
      content:
        "The RoamJS Otter extension has moved to storing your Otter password encrypted and on your device. Head to the roam/js/otter page to encrypt your password",
      onConfirm: () => {
        window.roamAlphaAPI.ui.mainWindow.openPage({
          page: { title: "roam/js/otter" },
        });
        deleteBlock(passwordNode.uid);
      },
    });
  }

  addBlockCommand({
    label: "Import Otter",
    callback: (blockUid) => render({ blockUid, pageUid }),
  });

  const autoImportRecordings = (
    parentUid: string,
    onSuccess?: (id: string) => void
  ) => {
    const email = getSettingValueFromTree({ tree, key: "email" });
    const password = localStorageGet("otter-password");
    const label = getSettingValueFromTree({ tree, key: "label" });
    const template = getSettingValueFromTree({ tree, key: "template" });
    return apiPost(`otter`, {
      email,
      password,
      operation: "GET_SPEECHES",
    }).then((r) => {
      const { children: idsChildren } = getSubTree({
        parentUid: pageUid,
        key: "ids",
      });
      const importedIds = new Set(idsChildren.map((t) => t.text));
      const bottom = getChildrenLengthByPageUid(parentUid);
      return Promise.all(
        (r.data.speeches as { id: string }[])
          .filter((s) => !importedIds.has(s.id))
          .map((s, i) =>
            importSpeech({
              credentials: { email, password },
              id: s.id,
              label,
              template,
              onSuccess,
              configUid: pageUid,
              parentUid,
              order: bottom + i,
            })
          )
      ).then((r) => r.flat());
    });
  };

  if (tree.some((t) => toFlexRegex("auto import").test(t.text))) {
    const dateName = toRoamDate(new Date());
    autoImportRecordings(getPageUidByPageTitle(dateName), (id) =>
      renderToast({
        id: "otter-auto-import",
        content: `Successfully imported otter recording: ${id}!`,
        intent: Intent.SUCCESS,
      })
    ).then((count) =>
      renderToast({
        id: "otter-auto-import",
        content: `Successfully imported ${count} latest otter recordings automatically to ${dateName}!`,
        intent: Intent.SUCCESS,
      })
    );
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
