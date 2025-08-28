import axios, { AxiosResponse } from "axios";

interface ApiResponse<T> {
  data: T | null;
  message: string;
  status: boolean | number;
}

interface LoggedUser {
  token: string;
}

const getToken = (): string | null => {
  return null;
};

export const fetchData = async <T = any>(
  url: string
): Promise<ApiResponse<T[]>> => {
  let data: T[] = [];
  let message = "";
  let status: boolean | number = false;
  let headers: Record<string, string> = {};

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    const resData = await res.json();

    if (res.ok) {
      data = resData.data;
      message = resData.message || "Request successful";
      status = resData.status || true;
    } else {
      data = resData.data || [];
      message = resData.message || "Error occurred";
      status = resData.status || res.status;
    }
  } catch (error) {
    data = [];
    message = "No server response";
    status = false;
  }

  return { status, message, data };
};

export const get = async <T = any>(url: string): Promise<ApiResponse<T[]>> => {
  let data: T[] = [];
  let message = "";
  let status: boolean | number = false;
  let headers: Record<string, string> = {};

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res: AxiosResponse = await axios.get(url, { headers });
    data = res.data.data;
    message = res.data.message;
    status = res.data.status;
  } catch (error: any) {
    if (error.response) {
      data = error.response.data.data || [];
      message = error.response.data.message || "Error occurred";
      status = error.response.data.status || false;
    } else {
      data = [];
      message = "No server response";
      status = false;
    }
  }

  return { status, message, data };
};

export const post = async <T = any>(
  url: string,
  payload: any
): Promise<ApiResponse<T[]>> => {
  let data: T[] = [];
  let message = "";
  let status: boolean | number = false;

  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const res: AxiosResponse = await axios.post(url, payload, { headers });
    data = res.data;
    message = res.data.message;
    status = res.status === 200;
  } catch (error: any) {
    if (error.response) {
      data = error.response.data.data || [];
      message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Error occurred";
      status = error.response.data.status || false;
    } else {
      data = [];
      message = "No server response";
      status = false;
    }
  }

  return { status, message, data };
};

export const put = async <T = any>(
  url: string,
  payload: Record<string, any> = {}
): Promise<ApiResponse<T[]>> => {
  let data: T[] = [];
  let message = "";
  let status: boolean | number = false;
  let headers: Record<string, string> = {};

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res: AxiosResponse = await axios.put(url, payload, { headers });
    data = res.data.data;
    message = res.data.message;
    status = res.data.status;
  } catch (error: any) {
    if (error.response) {
      data = error.response.data.data || [];
      message = error.response.data.message || "Error occurred";
      status = error.response.data.status || false;
    } else {
      data = [];
      message = "No server response";
      status = false;
    }
  }

  return { status, message, data };
};

export const destroy = async <T = any>(
  url: string
): Promise<ApiResponse<T[]>> => {
  let data: T[] = [];
  let message = "";
  let status: boolean | number = false;
  let headers: Record<string, string> = {};

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res: AxiosResponse = await axios.delete(url, { headers });
    data = res.data.data;
    message = res.data.message;
    status = res.data.status;
  } catch (error: any) {
    if (error.response) {
      data = error.response.data.data || [];
      message = error.response.data.message || "Error occurred";
      status = error.response.data.status || false;
    } else {
      data = [];
      message = "No server response";
      status = false;
    }
  }

  return { status, message, data };
};
