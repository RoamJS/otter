import {
  Button,
  Classes,
  Dialog,
  Intent,
  Radio,
  RadioGroup,
  Spinner,
  SpinnerSize,
} from "@blueprintjs/core";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBlock,
  deleteBlock,
  getOrderByBlockUid,
  getParentUidByBlockUid,
  getTreeByPageName,
} from "roam-client";
import {
  createOverlayRender,
  getSettingValueFromTree,
} from "roamjs-components";

type DialogProps = {
  blockUid: string;
};

const offsetToTimestamp = (offset?: number) => {
  if (!offset) {
    return "00:00";
  }
  const totalSeconds = Math.round(offset / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${seconds}`;
};

const ImportOtterDialog = ({
  onClose,
  blockUid,
}: {
  onClose: () => void;
} & DialogProps) => {
  const otterCredentials = useMemo(() => {
    const tree = getTreeByPageName("roam/js/otter");
    const email = getSettingValueFromTree({ tree, key: "email" });
    const password = getSettingValueFromTree({ tree, key: "password" });
    return { email, password };
  }, []);
  const [speeches, setSpeeches] = useState([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  useEffect(() => {
    axios
      .post("https://lambda.roamjs.com/otter", {
        ...otterCredentials,
        operation: "GET_SPEECHES",
      })
      .then((r) => setSpeeches(r.data.speeches))
      .finally(() => setLoading(false));
  }, [setSpeeches]);
  const onDeleteClose = useCallback(() => {
    onClose();
    deleteBlock(blockUid);
  }, [blockUid, onClose]);
  return (
    <Dialog
      isOpen={true}
      canEscapeKeyClose
      canOutsideClickClose
      title={"Import Otter Speech"}
      onClose={onDeleteClose}
    >
      <div className={Classes.DIALOG_BODY}>
        <RadioGroup
          selectedValue={value}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
        >
          {speeches.slice(page, page + 10).map((s) => (
            <Radio
              value={s.id}
              key={s.id}
              labelElement={
                <span>
                  <b>{s.title || "Untitled"}</b> -{" "}
                  <span style={{ fontWeight: 400 }}>{s.summary}</span>{" "}
                  <span style={{ fontSize: 8, fontWeight: 400 }}>
                    ({new Date(s.createdDate * 1000).toLocaleString()})
                  </span>
                </span>
              }
            />
          ))}
        </RadioGroup>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            text={"Previous"}
            disabled={page === 0}
            onClick={() => setPage(page - 10)}
          />
          <Button
            text={"Next"}
            disabled={page + 10 > speeches.length}
            onClick={() => setPage(page + 10)}
          />
        </div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          {loading && <Spinner size={SpinnerSize.SMALL} />}
          <Button
            disabled={loading || !value}
            text={"Import"}
            intent={Intent.PRIMARY}
            onClick={() => {
              setLoading(true);
              axios
                .post<{
                  title: string;
                  summary: string;
                  createdDate: number;
                  transcripts: { start: number; end: number; text: string }[];
                }>("https://lambda.roamjs.com/otter", {
                  ...otterCredentials,
                  operation: "GET_SPEECH",
                  params: { id: value },
                })
                .then((r) => {
                  const parentUid = getParentUidByBlockUid(blockUid);
                  const order = getOrderByBlockUid(blockUid);
                  createBlock({
                    parentUid,
                    node: {
                      text: `${r.data.title || "Untitled"} - ${
                        r.data.summary
                      } (${new Date(
                        r.data.createdDate * 1000
                      ).toLocaleString()})`,
                      children: [
                        ...r.data.transcripts.slice(0, 295).map((t) => ({
                          text: `${offsetToTimestamp(
                            t.start
                          )} - ${offsetToTimestamp(t.end)} - ${t.text}`,
                        })),
                        ...(r.data.transcripts.length > 295
                          ? [
                              {
                                text:
                                  "Roam currently only allows 300 blocks to be created at once. If you need larger transcripts to be imported, please reach out to support@roamjs.com!",
                              },
                            ]
                          : []),
                      ],
                    },
                    order,
                  });
                  onDeleteClose();
                });
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

export const render = createOverlayRender<DialogProps>(
  "otter-import",
  ImportOtterDialog
);

export default ImportOtterDialog;
