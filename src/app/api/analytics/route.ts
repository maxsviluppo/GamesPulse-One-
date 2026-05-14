import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export async function GET() {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;

    // Se non sono ancora impostate le credenziali nel file .env, forniamo i valori azzerati in attesa del collegamento effettivo
    if (!propertyId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json({
        status: "mock_active",
        message: "Inserisci GA_PROPERTY_ID e le credenziali di Google Cloud nel file .env per attivare lo streaming in tempo reale di Google Analytics 4.",
        data: {
          todayVisits: 0,
          monthlyVisits: 0,
          pageviews: 0,
          activeUsersRealtime: 0,
          adsenseMonth: 0.00,
          adsenseToday: 0.00,
          rpm: 3.40
        }
      });
    }

    const analyticsDataClient = new BetaAnalyticsDataClient();

    // 1. Estrazione Utenti Attivi in Tempo Reale (Realtime API)
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    });

    const activeUsersRealtime = parseInt(realtimeResponse?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

    // 2. Estrazione Metriche Generali (Ultimi 30 Giorni e Oggi)
    const [reportResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: "30daysAgo", endDate: "today" },
        { startDate: "today", endDate: "today" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
    });

    // Riga 0: Totale 30 giorni
    const monthlySessions = parseInt(reportResponse?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
    const monthlyViews = parseInt(reportResponse?.rows?.[0]?.metricValues?.[1]?.value || "0", 10);

    // Riga 1: Oggi
    const todaySessions = parseInt(reportResponse?.rows?.[1]?.metricValues?.[0]?.value || "0", 10);

    // Calcolo metriche AdSense sul traffico effettivo
    const rpm = 3.40;
    const adsenseToday = (todaySessions / 1000) * rpm;
    const adsenseMonth = (monthlySessions / 1000) * rpm;

    return NextResponse.json({
      status: "success",
      source: "Google Analytics 4 API",
      data: {
        todayVisits: todaySessions,
        monthlyVisits: monthlySessions,
        pageviews: monthlyViews,
        activeUsersRealtime: activeUsersRealtime || 0,
        adsenseMonth: parseFloat(adsenseMonth.toFixed(2)),
        adsenseToday: parseFloat(adsenseToday.toFixed(2)),
        rpm
      }
    });
  } catch (error: any) {
    console.error("Errore API Google Analytics:", error);
    // Ritorno di fallback robusto azzerato per garantire la coerenza del pannello
    return NextResponse.json({
      status: "fallback",
      error: error.message || "Errore di connessione API GA4",
      data: {
        todayVisits: 0,
        monthlyVisits: 0,
        pageviews: 0,
        activeUsersRealtime: 0,
        adsenseMonth: 0.00,
        adsenseToday: 0.00,
        rpm: 3.40
      }
    });
  }
}
