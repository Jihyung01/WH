import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

let mmkvInstance: MMKV | null = null;

/** 첫 접근 시에만 네이티브 MMKV를 연다 — 모듈 로드만으로 new MMKV()가 돌지 않게 함 */
export function getMMKV(): MMKV {
  if (!mmkvInstance) {
    mmkvInstance = new MMKV({ id: 'wherehere-global-storage' });
  }
  return mmkvInstance;
}

export const storage = {
  getString: (key: string) => getMMKV().getString(key),
  set: (key: string, value: boolean | string | number) => getMMKV().set(key, value),
  delete: (key: string) => getMMKV().delete(key),
  getBoolean: (key: string) => getMMKV().getBoolean(key),
  getNumber: (key: string) => getMMKV().getNumber(key),
};

export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    getMMKV().set(name, value);
  },
  getItem: (name) => {
    return getMMKV().getString(name) ?? null;
  },
  removeItem: (name) => {
    getMMKV().delete(name);
  },
};
