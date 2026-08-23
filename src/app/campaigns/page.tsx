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
  recommendations: {
    id: string;
    title: string;
    recommendation: string;
    actions: { actionType: string; description: string; executionTarget?: string | null; completed: boolean }[];
  }[];
};

type ProductCollection = { id: string; name: string; skus: string[] };

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
const recommendedStartDate = isoDate(addDays(today, 8));
const recommendedEndDate = isoDate(addDays(today, 22));

export default function CampaignBuilderPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>(["WOOCOMMERCE", "PINTEREST"]);
  const [name, setName] = useState("September Country Home Campaign");
  const [objective, setObjective] = useState("Increase qualified traffic and profitable sales for selected hero products.");
  const [startDate, setStartDate] = useState(recommendedStartDate);
  const [endDate, setEndDate] = useState(recommendedEndDate);
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
        setSelectedProducts(
          (data.products ?? [])
            .filter((row: ProductRow) => row.signal === "PROMOTE")
            .slice(0, 4)
            .map((row: ProductRow) => row.sku),
        );
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

  const selectedRows = useMemo(
    () => products.filter((product) => selectedProducts.includes(product.sku)),
    [products, selectedProducts],
  );
  const recommendedProducts = products.filter((product) => product.signal === "PROMOTE");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    if (!normalizedSearch) return products;
    return products.filter(
      (product) =>
        product.sku.toLowerCase().includes(normalizedSearch) ||
        product.name.toLowerCase().includes(normalizedSearch),
    );
  }, [products, normalizedSearch]);

  const datesOverridden = startDate !== recommendedStartDate || endDate !== recommendedEndDate;
  const start = new Date(`${startDate}T12:00:00`);
  const calendar = channels
    .map((type) => {
      const offset = type === "PINTEREST" ? -7 : type === "EMAIL" || type === "WOOCOMMERCE" ? 0 : type === "BING" ? -5 : -3;
      const label = channelOptions.find(([value]) => value === type)?.[1] ?? type;
      return { type, label, date: isoDate(addDays(start, offset)) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const heroNames = selectedRows.slice(0, 3).map((row) => row.name).join(", ") || "selected products";

  function persistCollections(next: ProductCollection[]) {
    setCollections(next);
    window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(next));
  }

  function toggleProduct(sku: string) {
    setSelectedProducts((current) =>
      current.includes(sku) ? current.filter((item) => item !== sku) : [...current, sku],
    );
  }

  function toggleChannel(type: string) {
    setChannels((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function createCollection() {
    const collectionName = newCollectionName.trim();
    if (!collectionName) {
      setCollectionMessage("Enter a collection name first.");
      return;
    }
    if (!selectedProducts.length) {
      setCollectionMessage("Select at least one product before saving a collection.");
      return;
    }
    persistCollections([
      ...collections,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: collectionName, skus: [...selectedProducts] },
    ]);
    setNewCollectionName("");
    setCollectionMessage(`${collectionName} saved with ${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}.`);
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
    <main className="campaign-shell">
      <header className="campaign-topbar">
        <div>
          <p className="eyebrow">Laughing Moose Gifts · LMG Marketing</p>
          <p className="campaign-links"><Link href="/">Marketing Intelligence</Link> · <Link href="/diagnostics">Diagnostic Center</Link></p>
        </div>
      </header>

      <section className="campaign-details-card">
        <h2 className="campaign-card-step-title">1 · Build New Marketing Campaign</h2>
        <p className="date-recommendation-copy"><strong>Intelligence recommendation:</strong> begin {recommendedStartDate} and end {recommendedEndDate}. These dates are recommendations only and remain subject to your approval or override.</p>
        <div className="campaign-details-grid">
          <label>Campaign name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Start <span className="recommendation-tag">Recommended</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>End <span className="recommendation-tag">Recommended</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>
        <label>Objective<textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} /></label>
        <div className="date-approval-row">
          <span className={datesOverridden ? "date-status overridden" : "date-status recommended"}>{datesOverridden ? "Dates overridden by you" : "Using Intelligence-recommended dates"}</span>
          {datesOverridden && <button type="button" className="button-muted" onClick={() => { setStartDate(recommendedStartDate); setEndDate(recommendedEndDate); }}>Restore recommended dates</button>}
        </div>
      </section>

      <section className="campaign-workspace">
        <h1 className="campaign-name-title">{name || "Untitled Campaign"}</h1>
        <h2 className="campaign-step-title">2 · Products to Promote</h2>
        <h3 className="campaign-section-title">Find products or use a collection</h3>
        <p className="campaign-intro">Search by SKU, full product name, or any part of the product name. Products marked <strong>PROMOTE</strong> already convert comparatively well but need more traffic.</p>
        <div className="campaign-divider" />

        <div className="promotion-columns">
          <section className="promotion-pane">
            <h3>Find individual products</h3>
            <p className="pane-subtitle">Search and select specific products to promote.</p>
            <label className="field-label">Search products
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SKU or product name — e.g. Rustic Rooster" />
            </label>
            <p className="match-count"><strong>{visibleProducts.length}</strong> matching product{visibleProducts.length === 1 ? "" : "s"}</p>
            <div className="product-table-wrap">
              <table className="campaign-table">
                <thead><tr><th>Use</th><th>Product</th><th>Signal</th><th>Views</th><th>Conversion</th><th>30d Revenue</th></tr></thead>
                <tbody>{visibleProducts.map((product) => (
                  <tr key={product.sku}>
                    <td><input type="checkbox" checked={selectedProducts.includes(product.sku)} onChange={() => toggleProduct(product.sku)} /></td>
                    <td><strong>{product.name}</strong><br /><small>{product.sku}</small></td>
                    <td><span className={`signal signal-${product.signal.toLowerCase()}`}>{product.signal}</span></td>
                    <td>{product.productViews}</td><td>{(product.purchaseConversionRate * 100).toFixed(1)}%</td><td>${product.commerceRevenue.toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="promotion-pane">
            <h3>Collections / related product groups</h3>
            <p className="pane-subtitle">Build and reuse product families and merchandising groups.</p>
            <p>Create collections such as Rustic Rooster, Autumn Checkerboard, candles, potholders, or any hand-picked merchandising group.</p>
            <div className="collection-create-row"><input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name — e.g. Rustic Rooster" /><button type="button" className="button-outline" onClick={createCollection}>Save selected as collection</button></div>
            <button type="button" className="button-muted" onClick={() => setSelectedProducts([])}>Clear selection</button>
            {collectionMessage && <p className="status-message"><strong>{collectionMessage}</strong></p>}
            <h4 className="saved-heading">Saved collections</h4>
            {collections.length === 0 ? <div className="collection-empty">No saved collections yet. Select products on the left, name the group above, and save it.</div> : <div className="collection-list">{collections.map((collection) => (
              <article className="collection-row" key={collection.id}><div><strong>{collection.name}</strong><small>{collection.skus.length} product{collection.skus.length === 1 ? "" : "s"}</small></div><div className="collection-actions"><button type="button" onClick={() => replaceWithCollection(collection)}>Promote collection</button><button type="button" onClick={() => addCollectionToCampaign(collection)}>Add to selection</button><button type="button" className="text-button" onClick={() => deleteCollection(collection.id)}>Delete</button></div></article>
            ))}</div>}
            <div className="campaign-tip">After selecting products or a collection, review the promotional channels below.</div>
          </section>
        </div>
      </section>

      <section id="channels" className="campaign-stage-panel">
        <div className="stage-heading"><span>3</span><div><p className="eyebrow">Channels & schedule</p><h2>Select the promotional channels</h2></div></div>
        <div className="channel-grid">{channelOptions.map(([type, label, detail]) => (
          <article className={`channel-card ${channels.includes(type) ? "selected" : ""}`} key={type}><label><input type="checkbox" checked={channels.includes(type)} onChange={() => toggleChannel(type)} /> <strong>{label}</strong></label><p>{detail}</p></article>
        ))}</div>
      </section>

      <section className="campaign-stage-panel"><div className="stage-heading"><span>4</span><div><p className="eyebrow">Recommended calendar</p><h2>Stagger discovery before the selling window</h2></div></div><div className="calendar-list">{calendar.map((item) => <p key={item.type}><strong>{item.date}</strong><span>{item.label}</span></p>)}</div></section>
      <section className="campaign-stage-panel"><div className="stage-heading"><span>5</span><div><p className="eyebrow">Creative</p><h2>Generated creative brief</h2></div></div><p><strong>Hero products:</strong> {heroNames}</p><p><strong>Core message:</strong> Warm, useful country-home inspiration with a clear reason to shop now. Adapt the hook, body copy, image/video treatment and CTA to each selected channel while keeping the campaign message consistent.</p><p><strong>Objective:</strong> {objective}</p></section>
      <section className="campaign-stage-panel"><div className="stage-heading"><span>6</span><div><p className="eyebrow">Schedule / execute / measure</p><h2>Create the reusable campaign workflow</h2></div></div><p>Saving creates calendar timing, creative drafts, approval-gated scheduling/execution, and post-campaign metrics review for each selected channel.</p><button className="primary-button" onClick={createCampaign} disabled={saving || !selectedProducts.length || !channels.length}>{saving ? "Creating…" : "Create Campaign Plan"}</button>{message && <p className="status-message"><strong>{message}</strong></p>}</section>

      <nav className="campaign-stepper" aria-label="Campaign progress"><span className="done">✓ Campaign Details</span><span className="active">2 Products to Promote</span><a href="#channels">3 Channels & Schedule</a><span>4 Review & Launch</span><a className="next-button" href="#channels">Next: Channels & Schedule →</a></nav>

      {campaigns.length > 0 && <section className="campaign-history"><h2>Saved campaign workflows</h2>{campaigns.map((campaign) => <details key={campaign.id}><summary>{campaign.name} · {campaign.status}</summary><p>{campaign.startDate.slice(0, 10)} → {campaign.endDate.slice(0, 10)} · {campaign.products.length} products · {campaign.recommendations.length} channel plans</p></details>)}</section>}
    </main>
  );
}
