import addBlockCommand from "roamjs-components/dom/addBlockCommand";
import getChildrenLengthByPageUid from "roamjs-components/queries/getChildrenLengthByPageUid";
import getPageTitleByBlockUid from "roamjs-components/queries/getPageTitleByBlockUid";
import registerSmartBlocksCommand from "roamjs-components/util/registerSmartBlocksCommand";
import runExtension from "roamjs-components/util/runExtension";
import {
  DEFAULT_LABEL,
  DEFAULT_TEMPLATE,
  importSpeech,
  OtterSpeech,
  render,
} from "./components/ImportOtterDialog";
import PasswordField from "./components/PasswordField";
import localStorageGet from "roamjs-components/util/localStorageGet";
import apiPost from "roamjs-components/util/apiPost";
import { render as renderToast } from "roamjs-components/components/Toast";
import { Intent } from "@blueprintjs/core";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import React from "react";

export default runExtension(async (args) => {
  args.extensionAPI.settings.panel.create({
    tabTitle: "Otter",
    settings: [
      {
        id: "email",
        description: "The email tied to your Otter account",
        name: "Email",
        action: { type: "input", placeholder: "support@roamjs.com" },
      },
      {
        id: "password",
        description: "The password needed to access your Otter account",
        name: "Password",
        action: {
          type: "reactComponent",
          component: () => React.createElement(PasswordField),
        },
      },
      {
        action: { type: "input", placeholder: DEFAULT_LABEL },
        id: "label",
        description: "The format labels use on import",
        name: "Import Label",
      },
      {
        action: { type: "input", placeholder: DEFAULT_TEMPLATE },
        id: "template",
        description: "The format each Otter note/transcript uses on import",
        name: "Import Template",
      },
      {
        action: { type: "switch" },
        id: "auto-import",
        description: "Automatically imports the latest recording when checked",
        name: "Auto Import Enabled",
      },
    ],
  });

  addBlockCommand({
    label: "Import Otter",
    callback: (blockUid) =>
      render({ blockUid, extensionAPI: args.extensionAPI }),
  });

  const autoImportRecordings = (
    parentUid: string,
    onSuccess?: (id: string) => void
  ) => {
    const email = (args.extensionAPI.settings.get("email") as string) || "";
    const password = localStorageGet("otter-password");
    const label =
      (args.extensionAPI.settings.get("label") as string) || DEFAULT_LABEL;
    const template =
      (args.extensionAPI.settings.get("template") as string) ||
      DEFAULT_TEMPLATE;
    return apiPost<{ speeches: OtterSpeech[] }>({
      domain: "https://api.samepage.network",
      path: `extensions/otter/speeches`,
      data: {
        email,
        password,
        operation: "GET_SPEECHES",
      },
    }).then((r) => {
      const ids =
        (args.extensionAPI.settings.get("ids") as Record<string, string>) || {};
      const importedIds = new Set(Object.keys(ids));
      const bottom = getChildrenLengthByPageUid(parentUid);
      return Promise.all(
        r.speeches
          .filter((s) => !importedIds.has(s.id))
          .map((s, i) =>
            importSpeech({
              credentials: { email, password },
              id: s.id,
              label,
              template,
              onSuccess,
              extensionAPI: args.extensionAPI,
              parentUid,
              order: bottom + i,
            })
          )
      ).then((r) => r.flat());
    });
  };

  if (args.extensionAPI.settings.get("auto-import")) {
    const dateName = window.roamAlphaAPI.util.dateToPageTitle(new Date());
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
        getPageUidByPageTitle(getPageTitleByBlockUid(context.targetUid)) ||
          context.targetUid
      ),
  });

  window.roamjs.extension.otter = {
    importOtter: (
      parentUid = window.roamAlphaAPI.util.dateToPageUid(new Date())
    ) => autoImportRecordings(parentUid),
  };
});
