import { Classes, Dialog, Radio, RadioGroup } from "@blueprintjs/core";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { getTreeByPageName } from "roam-client";
import {
  createOverlayRender,
  getSettingValueFromTree,
} from "roamjs-components";

const ImportOtterDialog = ({ onClose }: { onClose: () => void }) => {
  const otterCredentials = useMemo(() => {
    const tree = getTreeByPageName("roam/js/otter");
    const email = getSettingValueFromTree({ tree, key: "email" });
    const password = getSettingValueFromTree({ tree, key: "password" });
    return { email, password };
  }, []);
  const [speeches, setSpeeches] = useState([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios
      .post("https://lambda.roamjs.com/otter", {
        ...otterCredentials,
        operation: "GET_SPEECHES",
      })
      .then((r) => setSpeeches(r.data.speeches))
      .finally(() => setLoading(false));
  });
  return (
    <Dialog
      isOpen={true}
      canEscapeKeyClose
      canOutsideClickClose
      title={"Import Otter Speech"}
      onClose={onClose}
    >
      <div className={Classes.DIALOG_BODY}>
        <RadioGroup
          className={loading ? Classes.SKELETON : ""}
          selectedValue={value}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
        >
          {speeches.map((s) => (
            <Radio value={s.id} key={s.id} label={s.title} />
          ))}
        </RadioGroup>
      </div>
    </Dialog>
  );
};

export const render = createOverlayRender("otter-import", ImportOtterDialog);

export default ImportOtterDialog;
