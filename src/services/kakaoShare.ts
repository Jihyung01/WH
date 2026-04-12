import { Platform, Share } from 'react-native';
import { ensureKakaoInitialized, ensureKakaoUserSessionForSocial } from './kakaoCore';

const APP_STORE_FALLBACK = 'https://apps.apple.com/app/id6761450806';
const PLAY_STORE_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.wherehere.app';

/** @deprecated — use getStoreFallbackUrl() instead. Kept only for backward-compat imports. */
export const KAKAO_SHARE_FALLBACK_WEB_URL =
  Platform.OS === 'ios' ? APP_STORE_FALLBACK : PLAY_STORE_FALLBACK;

function getStoreFallbackUrl() {
  return Platform.OS === 'ios' ? APP_STORE_FALLBACK : PLAY_STORE_FALLBACK;
}

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
  const storeUrl = getStoreFallbackUrl();
  const fallbackUrl =
    params.mobileWebUrl ??
    params.webUrl ??
    storeUrl;

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

/**
 * iOS + New Architecture: @react-native-kakao/share void TurboModule calls can raise NSException → SIGABRT.
 * Same copy + registered web URL via system Share (user can pick KakaoTalk) without loading the native share module.
 */
async function shareTextWithSystemSheet(text: string, linkParams?: ShareLinkParams) {
  const storeUrl = getStoreFallbackUrl();
  const url = linkParams?.mobileWebUrl ?? linkParams?.webUrl ?? storeUrl;
  const message = `${text}\n\n${url}`;
  await Share.share(
    Platform.OS === 'ios' ? { message, url } : { message, title: 'WhereHere' },
  );
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
  if (Platform.OS === 'ios') {
    await shareTextWithSystemSheet(text, linkParams);
    return;
  }

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
    serverCallbackArgs: {
      platform: Platform.OS,
    },
  });
}

/**
 * Share a rich feed card via KakaoTalk (image thumbnail + title + description + app link).
 * Both iOS and Android attempt Kakao Feed Template first; falls back to system Share.
 */
export async function shareKakaoFeedCard({
  imageUrl,
  title,
  description,
  linkParams,
  buttonTitle = '앱에서 보기',
}: {
  imageUrl: string;
  title: string;
  description: string;
  linkParams?: ShareLinkParams;
  buttonTitle?: string;
}) {
  const storeUrl = getStoreFallbackUrl();

  try {
    await ensureKakaoInitialized();
    const KakaoShare = require('@react-native-kakao/share').default;

    const link = buildDefaultLink({
      ...linkParams,
      webUrl: linkParams?.webUrl ?? storeUrl,
      mobileWebUrl: linkParams?.mobileWebUrl ?? storeUrl,
    });

    const template = {
      content: {
        title,
        description,
        imageUrl,
        imageWidth: 800,
        imageHeight: 1000,
        link,
      },
      buttons: [
        {
          title: buttonTitle,
          link,
        },
      ],
    };

    await KakaoShare.shareFeedTemplate({
      template,
      useWebBrowserIfKakaoTalkNotAvailable: false,
      serverCallbackArgs: { platform: Platform.OS },
    });
  } catch {
    const message = [title, description, `\n다운로드: ${storeUrl}`].filter(Boolean).join('\n');
    await Share.share(
      Platform.OS === 'ios'
        ? { message, url: storeUrl }
        : { message, title: 'WhereHere' },
    );
  }
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
  const uniqueUuids = Array.from(new Set(receiverUuids.filter(Boolean)));
  if (uniqueUuids.length === 0) return [];

  if (Platform.OS === 'ios') {
    await shareTextWithSystemSheet(text, linkParams);
    return uniqueUuids;
  }

  await ensureKakaoUserSessionForSocial();
  const KakaoShare = require('@react-native-kakao/share').default;
  const link = buildDefaultLink(linkParams);
  const template = {
    text,
    link,
    buttons: [{ title: buttonTitle, link }],
  };

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
