import axios from "axios";
import { APIGatewayProxyHandler } from "aws-lambda";

const API_BASE_URL = "https://otter.ai/forward/api/v1";
const CSRF_COOKIE_NAME = "csrftoken";

type OtterSpeech = {
  speech_id: string;
  title: string;
  created_at: number;
  summary: string;
};

const getCookieValueAndHeader = (cookieHeader: string, cookieName: string) => {
  const match = cookieHeader.match(new RegExp(`${cookieName}=(?<value>.*?);`));
  return { cookieValue: match[1], cookieHeader: match[0] };
};
class OtterApi {
  private options: { email: string; password: string };
  private user: { id?: string };
  constructor(options: { email: string; password: string }) {
    this.options = options;
    this.user = {};
  }

  init = async () => {
    await this.login();
  };

  login = async () => {
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

    this.user = response.data.user;

    axios.defaults.headers.common.cookie = cookieHeader;

    console.log("Successfuly logged in to Otter.ai");

    return response;
  };

  getSpeeches = async (): Promise<OtterSpeech[]> => {
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
}

const transform = (s: OtterSpeech) => ({
  title: s.title,
  id: s.speech_id,
  createdDate: s.created_at,
  summary: s.summary,
});

export const handler: APIGatewayProxyHandler = (event) => {
  const { email, password, operation, params } = JSON.parse(event.body || "{}");
  const otterApi = new OtterApi({ email, password });
  if (operation === "GET_SPEECHES") {
    return otterApi
      .init()
      .then(() => otterApi.getSpeeches())
      .then((speeches) => ({
        statusCode: 200,
        body: JSON.stringify({
          speeches: speeches.map(transform),
        }),
        headers: {
          "Access-Control-Allow-Origin": "https://roamresearch.com",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Credentials": true,
        },
      }));
  } else if (operation === "GET_SPEECH") {
    return otterApi
      .init()
      .then(() => otterApi.getSpeech(params.id))
      .then((speech) => ({
        statusCode: 200,
        body: JSON.stringify({
          transcripts: speech.transcripts.map((t) => ({
            text: t.transcript,
            start: t.start_offset,
            end: t.end_ofset,
            t,
          })),
          ...transform(speech),
        }),
        headers: {
          "Access-Control-Allow-Origin": "https://roamresearch.com",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Credentials": true,
        },
      }));
  } else {
    return {
      statusCode: 400,
      body: `Unsupported operation ${operation}`,
      headers: {
        "Access-Control-Allow-Origin": "https://roamresearch.com",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Credentials": true,
      },
    };
  }
};
