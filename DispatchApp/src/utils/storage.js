import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys
export const STORAGE_KEYS = {
  NETWORKS: '@networks_master',
  MODELS: '@models_master',
  COLORS: '@colors_master',
  HISTORY: '@dispatch_history',
};

export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error(`Error saving data for ${key}`, e);
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error(`Error reading data for ${key}`, e);
    return null;
  }
};
