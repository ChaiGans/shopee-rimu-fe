const requiredEnvironment = [
  "RIMU_E2E_USERNAME",
  "RIMU_E2E_PASSWORD",
  "RIMU_E2E_ORDER_MAPPING_FILE",
  "RIMU_E2E_SUPPLIER_INFO_FILE",
  "RIMU_E2E_SKU_MASTER_FILE",
  "RIMU_E2E_BUSINESS_CONSTRAINTS_FILE",
];

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} for the live MSP E2E flow.`);
  }
  return value;
}

async function waitForSucceededStage(page, stage) {
  const stageCard = page.getByTestId(`msp-stage-${stage}`);
  await stageCard.waitFor({ state: "visible", timeout: 20 * 60 * 1000 });
  await stageCard.locator('[data-status="succeeded"]').waitFor({
    state: "visible",
    timeout: 20 * 60 * 1000,
  });
}

export async function run(page) {
  const username = requireEnvironment("RIMU_E2E_USERNAME");
  const password = requireEnvironment("RIMU_E2E_PASSWORD");
  const orderMappingFile = requireEnvironment("RIMU_E2E_ORDER_MAPPING_FILE");
  const supplierInfoFile = requireEnvironment("RIMU_E2E_SUPPLIER_INFO_FILE");
  const skuMasterFile = requireEnvironment("RIMU_E2E_SKU_MASTER_FILE");
  const businessConstraintsFile = requireEnvironment("RIMU_E2E_BUSINESS_CONSTRAINTS_FILE");

  page.setDefaultTimeout(30_000);

  if (await page.getByLabel("Username", { exact: true }).count()) {
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
  }

  await page.getByRole("link", { name: "MSP Procurement", exact: true }).click();
  await page.getByRole("heading", { name: "MSP E2E workbench", exact: true }).waitFor({ state: "visible" });

  await page.getByLabel("Reviewed order mapping CSV", { exact: true }).setInputFiles(orderMappingFile);
  await page.getByLabel("Supplier profile CSV", { exact: true }).setInputFiles(supplierInfoFile);
  await page.getByLabel("SKU master CSV", { exact: true }).setInputFiles(skuMasterFile);
  await page.getByLabel("Business constraints CSV", { exact: true }).setInputFiles(businessConstraintsFile);

  await page.getByLabel("Business capital", { exact: true }).fill(process.env.RIMU_E2E_BUSINESS_CAPITAL ?? "1000000");
  await page.getByLabel("Warehouse capacity", { exact: true }).fill(process.env.RIMU_E2E_WAREHOUSE_CAPACITY ?? "1000");
  await page.getByRole("button", { name: "Start MSP run", exact: true }).click();

  await page.getByTestId("msp-run-id").waitFor({ state: "visible", timeout: 120_000 });
  await waitForSucceededStage(page, "SALES_FORECASTING");
  await waitForSucceededStage(page, "ORDER_REPLENISHMENT");
  await waitForSucceededStage(page, "SSOA");
  await page.getByTestId("msp-run-status").locator('[data-status="succeeded"]').waitFor({ state: "visible", timeout: 120_000 });

  const artifactName = process.env.RIMU_E2E_ARTIFACT_NAME ?? "ranking.csv";
  await page.getByRole("button", { name: artifactName, exact: true }).first().click();
  await page.getByRole("dialog", { name: `Artifact: ${artifactName}` }).waitFor({ state: "visible" });
  await page.getByRole("dialog", { name: `Artifact: ${artifactName}` }).getByRole("button", { name: "Close", exact: true }).first().click();

  await page.reload();
  await page.getByTestId("msp-run-id").waitFor({ state: "visible", timeout: 120_000 });
}

export default run;
