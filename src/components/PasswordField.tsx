import {
  Button,
  InputGroup,
  Intent,
  Spinner,
  SpinnerSize,
} from "@blueprintjs/core";
import React, { useState } from "react";
import apiPost from "roamjs-components/util/apiPost";
import localStorageSet from "roamjs-components/util/localStorageSet";
import { render as renderToast } from "roamjs-components/components/Toast";

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
      />
      <Button
        intent={Intent.PRIMARY}
        text={"Encrypt password"}
        onClick={async () => {
          setLoading(true);
          setError("");
          apiPost<{ output: string }>(`otter`, {
            password: value,
            operation: "ENCRYPT_PASSWORD",
          })
            .then((r) => {
              localStorageSet("otter-password", r.output);
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
