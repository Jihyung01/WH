import { Platform } from 'react-native';

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
    'https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16';

  return {
    webUrl: params.webUrl ?? fallbackUrl,
    mobileWebUrl: params.mobileWebUrl ?? fallbackUrl,
    iosExecutionParams: params.iosExecutionParams,
    androidExecutionParams: params.androidExecutionParams,
  };
}

export async function shareKakaoText({
  text,
  buttonTitle = '앱 열기',
  linkParams,
}: {
  text: string;
  buttonTitle?: string;
  linkParams?: ShareLinkParams;
}) {
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

  // Use web fallback when KakaoTalk is not installed.
  return KakaoShare.shareTextTemplate({
    template,
    useWebBrowserIfKakaoTalkNotAvailable: true,
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
  const KakaoShare = require('@react-native-kakao/share').default;
  const link = buildDefaultLink(linkParams);
  const template = {
    text,
    link,
    buttons: [{ title: buttonTitle, link }],
  };

  return KakaoShare.sendTextTemplateToFriends({
    template,
    receiverUuids,
  });
}

