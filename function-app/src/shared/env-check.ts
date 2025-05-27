export function throwErrorIfSAPVariablesAreNotSet() {
  if (
    process.env.SAP_API_URL === undefined ||
    process.env.SAP_API_KEY === undefined
  )
    throw new Error(
      "SAP API URL and SAP API KEY are required to call SAP APIs.",
    );
}
