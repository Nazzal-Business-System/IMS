import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function assertSeedAllowed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allow = process.env.ALLOW_DEMO_SEED === "true";

  if (nodeEnv === "production" && !allow) {
    throw new Error(
      "Refusing to seed in production. Demo seed wipes all business tables. " +
        "Set ALLOW_DEMO_SEED=true only for intentional demo resets (never on live customer data)."
    );
  }

  if (!allow && nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error(
      "Set ALLOW_DEMO_SEED=true to run the destructive demo seed " +
        `(NODE_ENV=${nodeEnv}).`
    );
  }

  if (allow && nodeEnv === "production") {
    console.warn(
      "[seed] WARNING: ALLOW_DEMO_SEED=true in production — this will DELETE all IMS data and reseed demo credentials."
    );
  }
}

async function main() {
  assertSeedAllowed();
  console.log("Seeding IMS demo database...");

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reorderRule.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const viewerPassword = await bcrypt.hash("viewer123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@nazzal.demo",
      password: adminPassword,
      name: "Demo Admin",
      role: "admin",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@nazzal.demo",
      password: managerPassword,
      name: "Demo Manager",
      role: "manager",
    },
  });

  await prisma.user.create({
    data: {
      email: "viewer@nazzal.demo",
      password: viewerPassword,
      name: "Demo Viewer",
      role: "viewer",
    },
  });

  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Electronics", description: "Electronic devices and components" } }),
    prisma.category.create({ data: { name: "Office Supplies", description: "Paper, pens, and desk accessories" } }),
    prisma.category.create({ data: { name: "Furniture", description: "Office and warehouse furniture" } }),
    prisma.category.create({ data: { name: "Packaging", description: "Boxes, labels, and wrapping materials" } }),
    prisma.category.create({ data: { name: "Cleaning", description: "Cleaning supplies and equipment" } }),
    prisma.category.create({ data: { name: "Safety", description: "Safety gear and first aid" } }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "TechSource Global",
        email: "orders@techsource.demo",
        phone: "+1-555-0101",
        address: "1200 Innovation Blvd, Austin, TX",
        contactPerson: "Sarah Chen",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "OfficeMart Wholesale",
        email: "sales@officemart.demo",
        phone: "+1-555-0102",
        address: "88 Commerce Way, Chicago, IL",
        contactPerson: "Mike Johnson",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Prime Packaging Co",
        email: "info@primepack.demo",
        phone: "+1-555-0103",
        address: "45 Industrial Park, Dallas, TX",
        contactPerson: "Lisa Park",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "SafeWork Supplies",
        email: "contact@safework.demo",
        phone: "+1-555-0104",
        address: "200 Safety Lane, Denver, CO",
        contactPerson: "James Wilson",
      },
    }),
  ]);

  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Main Warehouse",
        location: "Building A, Floor 1-2",
        description: "Primary storage and distribution center",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "East Branch",
        location: "120 Harbor Road",
        description: "Regional east coast fulfillment",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Overflow Storage",
        location: "Unit 7, Industrial Zone",
        description: "Seasonal and bulk overflow storage",
      },
    }),
  ]);

  const [mainWh, eastWh, overflowWh] = warehouses;
  const [electronics, office, furniture, packaging, cleaning, safety] = categories;
  const [techSource, officeMart, primePack, safeWork] = suppliers;

  const productData = [
    { name: "Wireless Mouse", sku: "ELEC-001", cat: electronics, sup: techSource, wh: mainWh, cost: 12.5, sell: 24.99, qty: 145, reorder: 30 },
    { name: "USB-C Hub 7-Port", sku: "ELEC-002", cat: electronics, sup: techSource, wh: mainWh, cost: 28.0, sell: 49.99, qty: 62, reorder: 20 },
    { name: "27\" Monitor", sku: "ELEC-003", cat: electronics, sup: techSource, wh: mainWh, cost: 185.0, sell: 299.99, qty: 18, reorder: 10 },
    { name: "Bluetooth Keyboard", sku: "ELEC-004", cat: electronics, sup: techSource, wh: eastWh, cost: 35.0, sell: 59.99, qty: 8, reorder: 15 },
    { name: "Webcam HD 1080p", sku: "ELEC-005", cat: electronics, sup: techSource, wh: mainWh, cost: 42.0, sell: 79.99, qty: 34, reorder: 12 },
    { name: "Laptop Stand Aluminum", sku: "ELEC-006", cat: electronics, sup: techSource, wh: mainWh, cost: 22.0, sell: 39.99, qty: 55, reorder: 20 },
    { name: "A4 Copy Paper (500 sheets)", sku: "OFF-001", cat: office, sup: officeMart, wh: mainWh, cost: 4.5, sell: 8.99, qty: 320, reorder: 100 },
    { name: "Ballpoint Pens (Box 50)", sku: "OFF-002", cat: office, sup: officeMart, wh: mainWh, cost: 6.0, sell: 12.99, qty: 88, reorder: 25 },
    { name: "Sticky Notes Pack", sku: "OFF-003", cat: office, sup: officeMart, wh: eastWh, cost: 3.2, sell: 6.49, qty: 12, reorder: 30 },
    { name: "Desk Organizer", sku: "OFF-004", cat: office, sup: officeMart, wh: mainWh, cost: 15.0, sell: 28.99, qty: 41, reorder: 15 },
    { name: "Filing Cabinet 4-Drawer", sku: "FURN-001", cat: furniture, sup: officeMart, wh: overflowWh, cost: 120.0, sell: 219.99, qty: 6, reorder: 3 },
    { name: "Ergonomic Office Chair", sku: "FURN-002", cat: furniture, sup: officeMart, wh: mainWh, cost: 95.0, sell: 179.99, qty: 14, reorder: 5 },
    { name: "Conference Table 8ft", sku: "FURN-003", cat: furniture, sup: officeMart, wh: overflowWh, cost: 280.0, sell: 499.99, qty: 3, reorder: 2 },
    { name: "Shipping Box Medium", sku: "PACK-001", cat: packaging, sup: primePack, wh: mainWh, cost: 1.2, sell: 2.49, qty: 500, reorder: 200 },
    { name: "Bubble Wrap Roll", sku: "PACK-002", cat: packaging, sup: primePack, wh: mainWh, cost: 8.5, sell: 15.99, qty: 75, reorder: 30 },
    { name: "Packing Tape (6 rolls)", sku: "PACK-003", cat: packaging, sup: primePack, wh: eastWh, cost: 5.0, sell: 9.99, qty: 22, reorder: 20 },
    { name: "Label Printer", sku: "PACK-004", cat: packaging, sup: primePack, wh: mainWh, cost: 65.0, sell: 119.99, qty: 9, reorder: 5 },
    { name: "All-Purpose Cleaner 1L", sku: "CLN-001", cat: cleaning, sup: safeWork, wh: mainWh, cost: 3.5, sell: 6.99, qty: 110, reorder: 40 },
    { name: "Microfiber Cloths (12pk)", sku: "CLN-002", cat: cleaning, sup: safeWork, wh: mainWh, cost: 7.0, sell: 14.99, qty: 5, reorder: 15 },
    { name: "Safety Goggles", sku: "SAF-001", cat: safety, sup: safeWork, wh: eastWh, cost: 4.0, sell: 8.99, qty: 200, reorder: 50 },
    { name: "First Aid Kit Large", sku: "SAF-002", cat: safety, sup: safeWork, wh: mainWh, cost: 25.0, sell: 45.99, qty: 28, reorder: 10 },
    { name: "Fire Extinguisher 5lb", sku: "SAF-003", cat: safety, sup: safeWork, wh: overflowWh, cost: 35.0, sell: 59.99, qty: 7, reorder: 5 },
    { name: "HDMI Cable 2m", sku: "ELEC-007", cat: electronics, sup: techSource, wh: mainWh, cost: 5.5, sell: 11.99, qty: 180, reorder: 50 },
    { name: "Notebook A5 (Pack 5)", sku: "OFF-005", cat: office, sup: officeMart, wh: eastWh, cost: 8.0, sell: 15.99, qty: 3, reorder: 20 },
    { name: "Standing Desk Converter", sku: "FURN-004", cat: furniture, sup: officeMart, wh: mainWh, cost: 75.0, sell: 139.99, qty: 11, reorder: 8 },
  ];

  const products = await Promise.all(
    productData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          categoryId: p.cat.id,
          supplierId: p.sup.id,
          warehouseId: p.wh.id,
          costPrice: p.cost,
          sellingPrice: p.sell,
          quantity: p.qty,
          reorderLevel: p.reorder,
          status: "active",
        },
      })
    )
  );

  const movements = [
    { product: products[0], wh: mainWh, type: "IN" as const, qty: 50, ref: "INIT-001", notes: "Initial stock receipt" },
    { product: products[6], wh: mainWh, type: "OUT" as const, qty: 25, ref: "SALE-1042", notes: "Customer order fulfillment" },
    { product: products[1], wh: mainWh, type: "IN" as const, qty: 30, ref: "PO-8821", notes: "Supplier delivery" },
    { product: products[13], wh: mainWh, type: "OUT" as const, qty: 100, ref: "SHIP-3301", notes: "Bulk shipment" },
    { product: products[3], wh: eastWh, type: "ADJUSTMENT" as const, qty: 8, ref: "AUDIT-2024", notes: "Inventory count adjustment" },
    { product: products[18], wh: mainWh, type: "IN" as const, qty: 40, ref: "RET-5520", notes: "Return from customer" },
    { product: products[10], wh: overflowWh, type: "IN" as const, qty: 2, ref: "PO-8830", notes: "Furniture delivery" },
    { product: products[22], wh: mainWh, type: "OUT" as const, qty: 15, ref: "SALE-1055", notes: "Retail order" },
  ];

  for (const m of movements) {
    await prisma.stockMovement.create({
      data: {
        productId: m.product.id,
        warehouseId: m.wh.id,
        type: m.type,
        quantity: m.qty,
        reference: m.ref,
        notes: m.notes,
        createdById: admin.id,
      },
    });
  }

  const poDraft = await prisma.purchaseOrder.create({
    data: {
      supplierId: techSource.id,
      status: "draft",
      totalAmount: 0,
      createdById: manager.id,
      items: {
        create: [
          { productId: products[2].id, quantity: 5, unitPrice: 185.0 },
          { productId: products[4].id, quantity: 10, unitPrice: 42.0 },
        ],
      },
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: poDraft.id },
    data: { totalAmount: 5 * 185 + 10 * 42 },
  });

  const poOrdered = await prisma.purchaseOrder.create({
    data: {
      supplierId: officeMart.id,
      status: "ordered",
      totalAmount: 0,
      createdById: admin.id,
      items: {
        create: [
          { productId: products[6].id, quantity: 200, unitPrice: 4.5 },
          { productId: products[7].id, quantity: 50, unitPrice: 6.0 },
        ],
      },
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: poOrdered.id },
    data: { totalAmount: 200 * 4.5 + 50 * 6 },
  });

  const poReceived = await prisma.purchaseOrder.create({
    data: {
      supplierId: primePack.id,
      status: "received",
      totalAmount: 0,
      createdById: manager.id,
      items: {
        create: [
          { productId: products[13].id, quantity: 300, unitPrice: 1.2, receivedQuantity: 300 },
          { productId: products[14].id, quantity: 40, unitPrice: 8.5, receivedQuantity: 40 },
        ],
      },
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: poReceived.id },
    data: { totalAmount: 300 * 1.2 + 40 * 8.5 },
  });

  await prisma.purchaseOrder.create({
    data: {
      supplierId: safeWork.id,
      status: "cancelled",
      totalAmount: 150.0,
      createdById: admin.id,
      items: {
        create: [{ productId: products[20].id, quantity: 6, unitPrice: 25.0 }],
      },
    },
  });

  const poPending = await prisma.purchaseOrder.create({
    data: {
      supplierId: techSource.id,
      status: "ordered",
      totalAmount: 0,
      createdById: manager.id,
      items: {
        create: [
          { productId: products[5].id, quantity: 25, unitPrice: 22.0 },
          { productId: products[22].id, quantity: 100, unitPrice: 5.5 },
        ],
      },
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: poPending.id },
    data: { totalAmount: 25 * 22 + 100 * 5.5 },
  });

  const units = await Promise.all([
    prisma.unitOfMeasure.create({ data: { name: "Piece", symbol: "pc" } }),
    prisma.unitOfMeasure.create({ data: { name: "Box", symbol: "box" } }),
    prisma.unitOfMeasure.create({ data: { name: "Kilogram", symbol: "kg" } }),
    prisma.unitOfMeasure.create({ data: { name: "Liter", symbol: "L" } }),
  ]);

  const lowStockProducts = products.filter((p) => p.quantity <= p.reorderLevel).slice(0, 8);
  for (const [index, p] of lowStockProducts.entries()) {
    await prisma.reorderRule.create({
      data: {
        productId: p.id,
        minQuantity: p.reorderLevel,
        maxQuantity: p.reorderLevel * 3,
        autoPo: index === 0,
        isActive: true,
      },
    });
  }

  const sections = [
    "dashboard", "products", "categories", "warehouses", "suppliers",
    "stock_movements", "purchase_orders", "reports", "settings", "admin",
    "admin_users", "admin_permissions",
    "reorder_rules", "audit_log", "import_export", "units", "notifications",
  ];

  for (const section of sections) {
    await prisma.rolePermission.create({
      data: { role: "admin", section, canRead: true, canWrite: true },
    });
  }

  const managerPerms: Array<{ section: string; canRead: boolean; canWrite: boolean }> = [
    { section: "dashboard", canRead: true, canWrite: false },
    { section: "products", canRead: true, canWrite: true },
    { section: "categories", canRead: true, canWrite: true },
    { section: "warehouses", canRead: true, canWrite: true },
    { section: "suppliers", canRead: true, canWrite: true },
    { section: "stock_movements", canRead: true, canWrite: true },
    { section: "purchase_orders", canRead: true, canWrite: true },
    { section: "reports", canRead: true, canWrite: false },
    { section: "settings", canRead: true, canWrite: true },
    { section: "notifications", canRead: true, canWrite: false },
    { section: "reorder_rules", canRead: true, canWrite: true },
    { section: "audit_log", canRead: true, canWrite: false },
    { section: "import_export", canRead: true, canWrite: true },
    { section: "units", canRead: true, canWrite: true },
  ];
  for (const p of managerPerms) {
    await prisma.rolePermission.create({ data: { role: "manager", ...p } });
  }

  const viewerPerms: Array<{ section: string; canRead: boolean; canWrite: boolean }> = [
    { section: "dashboard", canRead: true, canWrite: false },
    { section: "products", canRead: true, canWrite: false },
    { section: "categories", canRead: true, canWrite: false },
    { section: "warehouses", canRead: true, canWrite: false },
    { section: "suppliers", canRead: true, canWrite: false },
    { section: "stock_movements", canRead: true, canWrite: false },
    { section: "purchase_orders", canRead: true, canWrite: false },
    { section: "reports", canRead: true, canWrite: false },
    { section: "settings", canRead: true, canWrite: false },
    { section: "notifications", canRead: true, canWrite: false },
  ];
  for (const p of viewerPerms) {
    await prisma.rolePermission.create({ data: { role: "viewer", ...p } });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      entity: "System",
      details: { message: "Demo data seeded" },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        title: "Low stock alert",
        message: "Low stock alert: Bluetooth Keyboard has only 8 units left.",
        type: "warning",
        category: "inventory",
        role: "manager",
        metadata: { productName: "Bluetooth Keyboard", quantity: 8 },
      },
      {
        title: "Purchase order received",
        message: "Purchase order received from TechSource Global.",
        type: "success",
        category: "purchase_order",
        role: "manager",
        metadata: { supplierName: "TechSource Global" },
      },
      {
        title: "Permissions updated",
        message: "Permissions updated for Manager role.",
        type: "info",
        category: "permission",
        role: "admin",
        metadata: { role: "manager" },
      },
      {
        title: "Welcome to IMS",
        message: "Your notification center is ready. You will receive real-time alerts here.",
        type: "info",
        category: "system",
        userId: admin.id,
      },
      {
        title: "System maintenance",
        message: "Scheduled database backup completed successfully.",
        type: "success",
        category: "system",
      },
    ],
  });

  console.log("Seed completed successfully.");
  console.log(`  Users: 3`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Suppliers: ${suppliers.length}`);
  console.log(`  Warehouses: ${warehouses.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Units: ${units.length}`);
  console.log(`  Reorder rules: ${lowStockProducts.length}`);
  console.log(`  Stock movements: ${movements.length}`);
  console.log(`  Purchase orders: 5`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
