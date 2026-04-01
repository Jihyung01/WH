import KakaoSocial, {
  type KakaoTalkFriend,
  type KakaoTalkFriendSelectResult,
} from '@react-native-kakao/social';

export type KakaoFriend = Pick<
  KakaoTalkFriend,
  'uuid' | 'profileNickname' | 'profileThumbnailImage' | 'favorite' | 'allowedMsg'
>;

export async function getKakaoTalkFriends(params?: {
  offset?: number;
  limit?: number;
}): Promise<{ totalCount: number; friends: KakaoFriend[] }> {
  const { offset = 0, limit = 100 } = params ?? {};
  const res = await KakaoSocial.getFriends({
    options: { offset, limit, order: 'asc', friendOrder: 'favorite' },
  });
  return { totalCount: res.totalCount, friends: res.friends as KakaoFriend[] };
}

export async function pickKakaoFriends(params?: {
  maxPickableCount?: number;
}): Promise<KakaoTalkFriendSelectResult> {
  const { maxPickableCount = 10 } = params ?? {};
  return KakaoSocial.selectMultipleFriends({
    mode: 'full',
    options: {
      title: '초대할 친구 선택',
      enableSearch: true,
      showMyProfile: false,
      showFavorite: true,
      showPickedFriend: true,
      minPickableCount: 1,
      maxPickableCount,
      viewAppearance: 'auto',
      orientation: 'portrait',
    },
  });
}

