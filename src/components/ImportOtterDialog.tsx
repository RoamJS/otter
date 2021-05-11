import { Classes, Dialog, Radio, RadioGroup } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { getTreeByPageName } from "roam-client";
import {
  createOverlayRender,
  getSettingValueFromTree,
} from "roamjs-components";
import { parseString } from "xml2js";
import axios from "axios";

const API_BASE_URL = "https://otter.ai/forward/api/v1";
const AWS_S3_URL = "https://s3.us-west-2.amazonaws.com";
const CSRF_COOKIE_NAME = "csrftoken";

const getCookieValueAndHeader = (cookieHeader: string, cookieName: string) => {
  const match = cookieHeader.match(new RegExp(`${cookieName}=(?<value>.*?);`));
  return { cookieValue: match[1], cookieHeader: match[0] };
};

class OtterApi {
  private options: { email: string; password: string };
  private user: { id?: string };
  private csrfToken: string;
  constructor(options: { email: string; password: string }) {
    this.options = options;
    this.user = {};
    this.csrfToken = "";
  }

  init = async () => {
    await this.#login();
  };

  #login = async () => {
    const { email, password } = this.options;

    if (!email || !password) {
      throw new Error(
        "Email and/or password were not given. Can't perform authentication to otter.ai"
      );
    }
    const csrfResponse = await axios({
      method: "GET",
      url: `${API_BASE_URL}/login_csrf`,
    });
    const {
      cookieValue: csrfToken,
      cookieHeader: csrfCookie,
    } = getCookieValueAndHeader(
      csrfResponse.headers["set-cookie"][0],
      CSRF_COOKIE_NAME
    );

    const response = await axios({
      method: "GET",
      url: `${API_BASE_URL}/login`,
      params: {
        username: email,
      },
      headers: {
        authorization: `Basic ${Buffer.from(`${email}:${password}`).toString(
          "base64"
        )}`,
        "x-csrftoken": csrfToken,
        cookie: csrfCookie,
      },
      withCredentials: true,
    });

    const cookieHeader = `${response.headers["set-cookie"][0]}; ${response.headers["set-cookie"][1]}`;
    ({ cookieValue: this.csrfToken } = getCookieValueAndHeader(
      response.headers["set-cookie"][0],
      CSRF_COOKIE_NAME
    ));

    this.user = response.data.user;

    axios.defaults.headers.common.cookie = cookieHeader;

    console.log("Successfuly logged in to Otter.ai");

    return response;
  };

  getSpeeches = async (): Promise<{ speech_id: string; title: string }[]> => {
    const { data } = await axios({
      method: "GET",
      url: `${API_BASE_URL}/speeches`,
      params: {
        userid: this.user.id,
      },
    });

    return data.speeches;
  };

  getSpeech = async (speech_id: string) => {
    const { data } = await axios({
      method: "GET",
      url: `${API_BASE_URL}/speech`,
      params: {
        speech_id,
        userid: this.user.id,
      },
    });

    return data.speech;
  };

  speechSearch = async (query: string) => {
    const { data } = await axios({
      method: "GET",
      url: `${API_BASE_URL}/speech_search`,
      params: {
        query,
        userid: this.user.id,
      },
    });

    return data.hits;
  };

  validateUploadService = () =>
    axios({
      method: "OPTIONS",
      url: `${AWS_S3_URL}/speech-upload-prod`,
      headers: {
        Accept: "*/*",
        "Access-Control-Request-Method": "POST",
        Origin: "https://otter.ai",
        Referer: "https://otter.ai/",
      },
    });

  uploadSpeech = async (file: File) => {
    const uploadOptionsResponse = await axios({
      method: "GET",
      url: `${API_BASE_URL}/speech_upload_params`,
      params: {
        userid: this.user.id,
      },
      headers: {
        Accept: "*/*",
        Connection: "keep-alive",
        Origin: "https://otter.ai",
        Referer: "https://otter.ai/",
      },
    });

    delete uploadOptionsResponse.data.data.form_action;

    const { Bucket, Key } = await axios
      .post(`${AWS_S3_URL}/speech-upload-prod`, {
        formData: { ...uploadOptionsResponse.data.data, file },
      })
      .then((r) => r.data as { Bucket: string; Key: string });

    const finishResponse = await axios({
      method: "POST",
      url: `${API_BASE_URL}/finish_speech_upload`,
      params: {
        bucket: Bucket,
        key: Key,
        language: "en",
        country: "us",
        userid: this.user.id,
      },
      headers: {
        "x-csrftoken": this.csrfToken,
      },
    });

    return finishResponse.data;
  };
}

const ImportOtterDialog = ({ onClose }: { onClose: () => void }) => {
  const otterApi = useMemo(() => {
    const tree = getTreeByPageName("roam/js/otter");
    const email = getSettingValueFromTree({ tree, key: "email" });
    const password = getSettingValueFromTree({ tree, key: "password" });
    return new OtterApi({ email, password });
  }, []);
  const [speeches, setSpeeches] = useState([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    otterApi
      .init()
      .then(() => otterApi.getSpeeches())
      .then((speeches) =>
        setSpeeches(speeches.map((s) => ({ title: s.title, id: s.speech_id })))
      )
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
