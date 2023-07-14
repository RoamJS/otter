import {
  Button,
  InputGroup,
  Intent,
  Spinner,
  SpinnerSize,
} from "@blueprintjs/core";
import React, { useState } from "react";
import apiPost from "roamjs-components/util/apiPost";
import localStorageGet from "roamjs-components/util/localStorageGet";
import localStorageSet from "roamjs-components/util/localStorageSet";
import { render as renderToast } from "roamjs-components/components/Toast";
import getExtensionApi from "roamjs-components/util/extensionApiContext";

const PasswordField = () => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <InputGroup
        value={value}
        type="password"
        onChange={(e) => setValue(e.target.value)}
        className={"mb-4"}
        placeholder="*****************"
      />
      <Button
        intent={Intent.PRIMARY}
        text={"Encrypt password"}
        onClick={async () => {
          setLoading(true);
          setError("");
          const extensionAPI = getExtensionApi();
          apiPost<{ output: string; token: string }>({
            domain: "https://api.samepage.network",
            path: `extensions/otter/speeches`,
            data: {
              email: (extensionAPI.settings.get("email") as string) || "",
              password: value,
              operation: "ENCRYPT_PASSWORD",
            },
          })
            .then((r) => {
              localStorageSet("otter-password", r.output);
              localStorageSet("token", r.token);
              renderToast({
                id: "otter-password",
                content: "Successfully encrypted password locally!",
              });
            })
            .catch((e) =>
              setError(e.response?.data?.error || e.response?.data || e.message)
            )
            .finally(() => setLoading(false));
        }}
        rightIcon={loading && <Spinner size={SpinnerSize.SMALL} />}
      />
      <div style={{ color: "darkred" }}>{error}</div>
    </div>
  );
};

export default PasswordField;
