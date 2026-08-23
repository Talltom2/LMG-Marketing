"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProductRow = {
  sku: string;
  name: string;
  units: number;
  commerceRevenue: number;
  productViews: number;
  purchaseConversionRate: number;
  signal: "PROMOTE" | "FIX_CONVERSION" | "WATCH" | "INSUFFICIENT_DATA";
};

type SavedCampaign = {
  id: string;
  name: string;
  objective?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  products: { product: { sku: string; name: string } }[];
  recommendations: { id: string; title: string; recommendation: string; actions: { actionType: string; description: string; executionTarget?: string | null; completed: boolean }[] }[];
};

type ProductCollection = {
  id: string;
  name: string;
  skus: string[];
};

const COLLECTION_STORAGE_KEY = "lmg-marketing-product-collections-v1";

const channelOptions = [
  ["WOOCOMMERCE", "WooCommerce", "Primary store landing pages, offers and onsite merchandising"],
  ["PINTEREST", "Pinterest", "Pins, boards and discovery traffic"],
  ["TIKTOK", "TikTok", "Short-form creative, catalog and Shop"],
  ["META", "Facebook / Instagram", "Organic, catalog and paid social"],
  ["BING", "Bing / Microsoft", "Search, Shopping and ads"],
  ["WALMART", "Walmart", "Marketplace promotions and listing support"],
  ["AMAZON_US", "Amazon US", "Marketplace promotion"],
  ["AMAZON_CA", "Amazon Canada", "Marketplace promotion"],
  ["EMAIL", "Email", "Customer-list campaign"],
] as const;

const today = new Date();
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);

export default function CampaignBuilderPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>(["WOOCOMMERCE", "PINTEREST"]);
  const [name, setName] = useState("September Country Home Campaign");
  const [objective, setObjective] = useState("Increase qualified traffic and profitable sales for selected hero products.");
  const [startDate, setStartDate] = useState(isoDate(addDays(today, 8)));
  const [endDate, setEndDate] = useState(isoDate(addDays(today, 22)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionMessage, setCollectionMessage] = useState("");

  async function refresh() {
    const [productResponse, campaignResponse] = await Promise.all([
      fetch("/api/intelligence/products?days=30", { cache: "no-store" }),
      fetch("/api/campaigns", { cache: "no-store" }),
    ]);
    if (productResponse.ok) {
      const data = await productResponse.json();
      setProducts(data.products ?? []);
      if (!selectedProducts.length) {
        setSelectedProducts((data.products ?? []).filter((row: ProductRow) => row.signal === "PROMOTE").slice(0, 4).map((row: ProductRow) => row.sku));
      }
    }
    if (campaignResponse.ok) {
      const data = await campaignResponse.json();
      setCampaigns(data.campaigns ?? []);
    }
  }

  useEffect(() => {
    void refresh();
    try {
      const saved = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
      if (saved) setCollections(JSON.parse(saved));
    } catch {
      setCollections([]);
    }
  }, []);

  const selectedRows = useMemo(() => products.filter((product) => selectedProducts.includes(product.sku)), [products, selectedProducts]);
  const recommendedProducts = products.filter((product) => product.signal === "PROMOTE");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    if (!normalizedSearch) return products;
    return products.filter((product) => product.sku.toLowerCase().includes(normalizedSearch) || product.name.toLowerCase().includes(normalizedSearch));
  }, [products, normalizedSearch]);

  const start = new Date(`${startDate}T12:00:00`);
  const calendar = channels.map((type) => {
    const offset = type === "PINTEREST" ? -7 : type === "EMAIL" || type === "WOOCOMMERCE" ? 0 : type === "BING" ? -5 : -3;
    const label = channelOptions.find(([value]) => value === type)?.[1] ?? type;
    return { type, label, date: isoDate(addDays(start, offset)) };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const heroNames = selectedRows.slice(0, 3).map((row) => row.name).join(", ") || "selected products";

  function persistCollections(next: ProductCollection[]) {
    setCollections(next);
    window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(next));
  }

  function toggleProduct(sku: string) {
    setSelectedProducts((current) => current.includes(sku) ? current.filter((item) => item !== sku) : [...current, sku]);
  }

  function toggleChannel(type: string) {
    setChannels((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  function createCollection() {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName) {
      setCollectionMessage("Enter a collection name first.");
      return;
    }
    if (!selectedProducts.length) {
      setCollectionMessage("Select at least one product before saving a collection.");
      return;
    }
    const next: ProductCollection = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      skus: [...selectedProducts],
    };
    persistCollections([...collections, next]);
    setNewCollectionName("");
    setCollectionMessage(`${trimmedName} saved with ${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}.`);
  }

  function addCollectionToCampaign(collection: ProductCollection) {
    setSelectedProducts((current) => Array.from(new Set([...current, ...collection.skus])));
    setCollectionMessage(`${collection.name} added to this campaign.`);
  }

  function replaceWithCollection(collection: ProductCollection) {
    setSelectedProducts(collection.skus);
    setCollectionMessage(`${collection.name} is now the campaign product set.`);
  }

  function deleteCollection(id: string) {
    const collection = collections.find((item) => item.id === id);
    persistCollections(collections.filter((item) => item.id !== id));
    setCollectionMessage(collection ? `${collection.name} deleted.` : "Collection deleted.");
  }

  async function createCampaign() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective, productSkus: selectedProducts, channels, startDate, endDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create campaign");
      setMessage("Campaign plan saved. Calendar, creative drafts, execution checkpoints and metrics review actions are now persisted.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">LMG Marketing</p>
        <h1>Campaign Builder</h1>
        <p className="subtitle">Campaign → Products / Collections → Channels → Calendar → Creative → Approval / Execution → Metrics → Diagnostics → Learning</p>
        <p><Link href="/">← Marketing Intelligence</Link> · <Link href="/diagnostics">Diagnostic Center →</Link></p>
      </header>

      <section className="scorecards">
        <article className="card"><span>Recommended products</span><strong>{recommendedProducts.length}</strong><small>30-day intelligence signal</small></article>
        <article className="card"><span>Selected products</span><strong>{selectedProducts.length}</strong><small>Hero + support products</small></article>
        <article className="card"><span>Saved collections</span><strong>{collections.length}</strong><small>Reusable product groups</small></article>
        <article className="card"><span>Promotion tools</span><strong>{channels.length}</strong><small>Selected channels</small></article>
        <article className="card"><span>Saved campaigns</span><strong>{campaigns.length}</strong><small>Reusable campaign history</small></article>
      </section>

      <section className="panel">
        <p className="eyebrow">1 · Campaign</p>
        <h2>Define the promotion</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          <label>Name<br /><input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></label>
          <label>Start<br /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%" }} /></label>
          <label>End<br /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%" }} /></label>
        </div>
        <label>Objective<br /><textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} style={{ width: "100%" }} /></label>
      </section>

      <section className="panel">
        <p className="eyebrow">2 · What to promote</p>
        <h2>Find products or use a collection</h2>
        <p>Search by SKU, full product name, or any part of the product name. Products marked <strong>PROMOTE</strong> already convert comparatively well but need more traffic.</p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,2fr) minmax(220px,1fr)", gap: 16, alignItems: "end", marginBottom: 16 }}>
          <label><strong>Search products</strong><br />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SKU or product name — e.g. Rustic Rooster"
              style={{ width: "100%" }}
            />
          </label>
          <div><strong>{visibleProducts.length}</strong> matching product{visibleProducts.length === 1 ? "" : "s"}</div>
        </div>

        {collections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3>Saved collections</h3>
            <div className="modules">
              {collections.map((collection) => (
                <article className="module" key={collection.id}>
                  <h3>{collection.name}</h3>
                  <p>{collection.skus.length} product{collection.skus.length === 1 ? "" : "s"}</p>
                  <p><small>{collection.skus.slice(0, 5).join(", ")}{collection.skus.length > 5 ? "…" : ""}</small></p>
                  <p>
                    <button type="button" onClick={() => replaceWithCollection(collection)}>Promote collection</button>{" "}
                    <button type="button" onClick={() => addCollectionToCampaign(collection)}>Add to selection</button>{" "}
                    <button type="button" onClick={() => deleteCollection(collection.id)}>Delete</button>
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxHeight: 430, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th align="left">Use</th><th align="left">Product</th><th align="left">Signal</th><th align="right">Views</th><th align="right">Conversion</th><th align="right">30d Revenue</th></tr></thead>
            <tbody>{visibleProducts.map((product) => (
              <tr key={product.sku}>
                <td><input type="checkbox" checked={selectedProducts.includes(product.sku)} onChange={() => toggleProduct(product.sku)} /></td>
                <td><strong>{product.name}</strong><br /><small>{product.sku}</small></td>
                <td>{product.signal}</td>
                <td align="right">{product.productViews}</td>
                <td align="right">{(product.purchaseConversionRate * 100).toFixed(1)}%</td>
                <td align="right">${product.commerceRevenue.toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #ddd" }}>
          <h3>Create a collection from the current selection</h3>
          <p>Use this for related product families such as Rustic Rooster, Autumn Checkerboard, candles, potholders, or any hand-picked merchandising group.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name — e.g. Rustic Rooster"
              style={{ minWidth: 300 }}
            />
            <button type="button" onClick={createCollection}>Save selected as collection</button>
            <button type="button" onClick={() => setSelectedProducts([])}>Clear selection</button>
          </div>
          {collectionMessage && <p><strong>{collectionMessage}</strong></p>}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">3 · Promotional tools</p>
        <h2>Select the channels</h2>
        <div className="modules">
          {channelOptions.map(([type, label, detail]) => (
            <article className="module" key={type} style={{ outline: channels.includes(type) ? "2px solid currentColor" : undefined }}>
              <label style={{ cursor: "pointer" }}><input type="checkbox" checked={channels.includes(type)} onChange={() => toggleChannel(type)} /> <strong>{label}</strong></label>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">4 · Recommended calendar</p>
        <h2>Stagger discovery before the selling window</h2>
        {calendar.map((item) => <p key={item.type}><strong>{item.date}</strong> · {item.label}</p>)}
        {!calendar.length && <p>Select at least one promotional tool.</p>}
      </section>

      <section className="panel">
        <p className="eyebrow">5 · Creative</p>
        <h2>Generated creative brief</h2>
        <p><strong>Hero products:</strong> {heroNames}</p>
        <p><strong>Core message:</strong> Warm, useful country-home inspiration with a clear reason to shop now. Adapt the hook, body copy, image/video treatment and CTA to each selected channel while keeping the campaign message consistent.</p>
        <p><strong>Objective:</strong> {objective}</p>
        <p><small>V1 persists channel-specific creative drafts and execution instructions. External publishing/ad-spend actions remain approval-gated.</small></p>
      </section>

      <section className="panel">
        <p className="eyebrow">6 · Schedule / Execute / Measure</p>
        <h2>Create the reusable campaign workflow</h2>
        <p>Saving creates an approved campaign plan with four actions per channel: calendar timing, creative draft, approval-gated scheduling/execution, and post-campaign metrics review. The metrics review explicitly feeds Expected vs Actual results back into the Diagnostic/Intelligence Engine.</p>
        <button onClick={createCampaign} disabled={saving || !selectedProducts.length || !channels.length}>{saving ? "Creating…" : "Create Campaign Plan"}</button>
        {message && <p><strong>{message}</strong></p>}
      </section>

      <section className="panel">
        <p className="eyebrow">Campaign history</p>
        <h2>Saved workflows</h2>
        {!campaigns.length && <p>No saved campaigns yet.</p>}
        {campaigns.map((campaign) => (
          <article className="module" key={campaign.id} style={{ marginBottom: 16 }}>
            <h3>{campaign.name}</h3>
            <p><strong>{campaign.status}</strong> · {campaign.startDate.slice(0, 10)} → {campaign.endDate.slice(0, 10)} · {campaign.products.length} products · {campaign.recommendations.length} channel plans</p>
            <p>{campaign.objective}</p>
            {campaign.recommendations.map((recommendation) => (
              <details key={recommendation.id}><summary>{recommendation.title}</summary><p>{recommendation.recommendation}</p>{recommendation.actions.map((action, index) => <p key={index}><strong>{action.actionType}</strong> · {action.description}</p>)}</details>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
