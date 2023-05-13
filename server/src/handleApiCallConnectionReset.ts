export async function handleApiCallConnectionReset<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall()
  } catch (error: any) {
    if (error.code === 'ECONNRESET') return handleApiCallConnectionReset(apiCall)
    throw error
  }
}
