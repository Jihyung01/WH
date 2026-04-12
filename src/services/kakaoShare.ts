import { Platform, Share } from 'react-native';
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

/**
 * iOS + New Architecture: @react-native-kakao/share void TurboModule calls can raise NSException → SIGABRT.
 * Same copy + registered web URL via system Share (user can pick KakaoTalk) without loading the native share module.
 */
async function shareTextWithSystemSheet(text: string, linkParams?: ShareLinkParams) {
  const link = buildDefaultLink(linkParams);
  const url = link.mobileWebUrl ?? link.webUrl;
  const message = url ? `${text}\n\n${url}` : text;
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

const APP_STORE_URL = 'https://apps.apple.com/app/id6761450806';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.wherehere.app';

/**
 * Share a rich feed card via KakaoTalk (image thumbnail + title + description + app link).
 *
 * Android: Kakao Feed Template → rich card with image thumbnail, title, description, button.
 * iOS:     System Share sheet (Kakao TurboModule crashes on New Arch).
 * Fallback: System Share with text only (no Notion URL).
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
  if (Platform.OS === 'ios') {
    const message = [title, description].filter(Boolean).join('\n');
    await Share.share({ message, url: imageUrl });
    return;
  }

  try {
    await ensureKakaoInitialized();
    const KakaoShare = require('@react-native-kakao/share').default;

    const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
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
    const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    const message = [title, description, storeUrl].filter(Boolean).join('\n');
    await Share.share({ message, title: 'WhereHere' });
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
