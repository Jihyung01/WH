import { Platform } from 'react-native';
import { ensureKakaoInitialized, ensureKakaoUserSessionForSocial } from './kakaoCore';

/** Must match a domain registered under Kakao Developers → 앱 → 제품 링크 관리 → 웹 도메인. */
export const KAKAO_SHARE_FALLBACK_WEB_URL =
  'https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16';

type ShareLinkParams = {
  /** Landing page when app is not installed / on desktop */
  webUrl?: string;
  /** Landing page when opened in mobile web */
  mobileWebUrl?: string;
  /** Deep-link params for iOS app execution */
  iosExecutionParams?: Record<string, string>;
  /** Deep-link params for Android app execution */
  androidExecutionParams?: Record<string, string>;
};

function buildDefaultLink(params: ShareLinkParams = {}) {
  // We prefer execution params to open the app when installed.
  // For fallback, we point to the public Notion page (privacy/terms) which is always accessible.
  const fallbackUrl =
    params.mobileWebUrl ??
    params.webUrl ??
    KAKAO_SHARE_FALLBACK_WEB_URL;

  const link = {
    webUrl: params.webUrl ?? fallbackUrl,
    mobileWebUrl: params.mobileWebUrl ?? fallbackUrl,
    iosExecutionParams: params.iosExecutionParams,
    androidExecutionParams: params.androidExecutionParams,
  };
  // Avoid passing undefined fields into native JSON encoding path.
  return Object.fromEntries(Object.entries(link).filter(([, v]) => v != null)) as {
    webUrl: string;
    mobileWebUrl: string;
    iosExecutionParams?: Record<string, string>;
    androidExecutionParams?: Record<string, string>;
  };
}

const KAKAO_FRIEND_SEND_BATCH_SIZE = 5;

export async function shareKakaoText({
  text,
  buttonTitle = '앱 열기',
  linkParams,
}: {
  text: string;
  buttonTitle?: string;
  linkParams?: ShareLinkParams;
}) {
  await ensureKakaoInitialized();
  const KakaoShare = require('@react-native-kakao/share').default;
  const template = {
    text,
    link: buildDefaultLink(linkParams),
    buttons: [
      {
        title: buttonTitle,
        link: buildDefaultLink(linkParams),
      },
    ],
  };

  // Avoid sharer.kakao.com in Safari — misconfigured keys/domains often return 4019; callers use Share fallback.
  return KakaoShare.shareTextTemplate({
    template,
    useWebBrowserIfKakaoTalkNotAvailable: false,
    // Optional analytics on Kakao side
    serverCallbackArgs: {
      platform: Platform.OS,
    },
  });
}

export async function sendKakaoTextToFriends({
  text,
  receiverUuids,
  buttonTitle = '앱 열기',
  linkParams,
}: {
  text: string;
  receiverUuids: string[];
  buttonTitle?: string;
  linkParams?: ShareLinkParams;
}) {
  await ensureKakaoUserSessionForSocial();
  const KakaoShare = require('@react-native-kakao/share').default;
  const link = buildDefaultLink(linkParams);
  const template = {
    text,
    link,
    buttons: [{ title: buttonTitle, link }],
  };

  const uniqueUuids = Array.from(new Set(receiverUuids.filter(Boolean)));
  if (uniqueUuids.length === 0) return [];

  // Kakao friends message APIs are safer when sent in small batches.
  const sent: string[] = [];
  for (let i = 0; i < uniqueUuids.length; i += KAKAO_FRIEND_SEND_BATCH_SIZE) {
    const chunk = uniqueUuids.slice(i, i + KAKAO_FRIEND_SEND_BATCH_SIZE);
    const result: string[] = await KakaoShare.sendTextTemplateToFriends({
      template,
      receiverUuids: chunk,
    });
    sent.push(...(result ?? []));
  }
  return sent;
}

