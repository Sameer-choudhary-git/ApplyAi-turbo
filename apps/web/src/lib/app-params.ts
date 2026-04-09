const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map<string, string>() } : window;
const storage = windowObj.localStorage as Storage;

const toSnakeCase = (str: string): string => {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

interface AppParamOptions {
    defaultValue?: string;
    removeFromUrl?: boolean;
}

const getAppParamValue = (paramName: string, { defaultValue, removeFromUrl = false }: AppParamOptions = {}): string | null => {
    if (isNode) {
        return defaultValue ?? null;
    }
    const storageKey = `app_${toSnakeCase(paramName)}`;
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get(paramName);
    
    if (removeFromUrl && searchParam !== null) {
        urlParams.delete(paramName);
        const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    if (searchParam) {
        storage.setItem(storageKey, searchParam);
        return searchParam;
    }
    
    if (defaultValue) {
        storage.setItem(storageKey, defaultValue);
        return defaultValue;
    }
    
    const storedValue = storage.getItem(storageKey);
    if (storedValue) {
        return storedValue;
    }
    return null;
};

export interface AppParams {
    appId: string | null;
    token: string | null;
    fromUrl: string | null;
    appBaseUrl: string | null;
}

const getAppParams = (): AppParams => {
    if (getAppParamValue("clear_access_token") === 'true') {
        storage.removeItem('app_access_token');
        storage.removeItem('token');
    }
    return {
        appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_APP_ID }),
        token: getAppParamValue("access_token", { removeFromUrl: true }),
        fromUrl: getAppParamValue("from_url", { defaultValue: typeof window !== 'undefined' ? window.location.href : '' }),
        appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_APP_BASE_URL }),
    };
};

export const appParams: AppParams = {
    ...getAppParams()
};