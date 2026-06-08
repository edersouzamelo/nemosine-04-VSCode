import { NextResponse } from "next/server";
import { auth } from "@/auth";
import * as db from "@/app/lib/sovereignStore";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "").trim();

    switch (action) {
      // Agenda Actions
      case "get_agenda": {
        const events = await db.getAgendaEvents(userId);
        return NextResponse.json({ events });
      }
      case "save_agenda_event": {
        const event = body.event;
        const saved = await db.saveAgendaEvent(userId, event);
        return NextResponse.json({ event: saved });
      }
      case "toggle_agenda_event": {
        const { eventId, completed } = body;
        await db.toggleAgendaEvent(userId, eventId, completed);
        return NextResponse.json({ ok: true });
      }
      case "delete_agenda_event": {
        const { eventId } = body;
        await db.deleteAgendaEvent(userId, eventId);
        return NextResponse.json({ ok: true });
      }

      // Treinador Actions (Measures)
      case "get_gym_measures": {
        const measures = await db.getGymMeasures(userId);
        return NextResponse.json({ measures });
      }
      case "save_gym_measure": {
        const measure = body.measure;
        const saved = await db.saveGymMeasure(userId, measure);
        return NextResponse.json({ measure: saved });
      }
      case "delete_gym_measure": {
        const { measureId } = body;
        await db.deleteGymMeasure(userId, measureId);
        return NextResponse.json({ ok: true });
      }

      // Treinador Actions (Workouts)
      case "get_gym_workouts": {
        const workouts = await db.getGymWorkouts(userId);
        return NextResponse.json({ workouts });
      }
      case "save_gym_workout": {
        const workout = body.workout;
        const saved = await db.saveGymWorkout(userId, workout);
        return NextResponse.json({ workout: saved });
      }
      case "delete_gym_workout": {
        const { workoutId } = body;
        await db.deleteGymWorkout(userId, workoutId);
        return NextResponse.json({ ok: true });
      }

      // Mordomo Actions
      case "get_transactions": {
        const transactions = await db.getTransactions(userId);
        return NextResponse.json({ transactions });
      }
      case "save_transaction": {
        const tx = body.tx;
        const saved = await db.saveTransaction(userId, tx);
        return NextResponse.json({ tx: saved });
      }
      case "delete_transaction": {
        const { txId } = body;
        await db.deleteTransaction(userId, txId);
        return NextResponse.json({ ok: true });
      }

      // Médico Actions
      case "get_medical_documents": {
        const documents = await db.getMedicalDocuments(userId);
        return NextResponse.json({ documents });
      }
      case "save_medical_document": {
        const doc = body.doc;
        const saved = await db.saveMedicalDocument(userId, doc);
        return NextResponse.json({ doc: saved });
      }
      case "delete_medical_document": {
        const { docId } = body;
        await db.deleteMedicalDocument(userId, docId);
        return NextResponse.json({ ok: true });
      }

      // Travessia Actions
      case "get_travessia_data": {
        const data = await db.getTravessiaData(userId);
        return NextResponse.json(data);
      }
      case "update_caste": {
        const { caste } = body;
        await db.updateCaste(userId, caste);
        return NextResponse.json({ ok: true });
      }
      case "unlock_region": {
        const { regionId } = body;
        await db.unlockRegion(userId, regionId);
        return NextResponse.json({ ok: true });
      }
      case "save_boss_log": {
        const { log } = body;
        await db.saveBossLog(userId, log);
        return NextResponse.json({ ok: true });
      }
      case "save_relic": {
        const { relic } = body;
        await db.saveUserRelic(userId, relic);
        return NextResponse.json({ ok: true });
      }

      // Linha do Destino Actions
      case "get_destiny_events": {
        const events = await db.getDestinyEvents(userId);
        return NextResponse.json({ events });
      }
      case "get_destiny_event": {
        const eventId = String(body.eventId || "");
        if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });
        const event = await db.getDestinyEventById(userId, eventId);
        if (!event) return NextResponse.json({ error: "Destiny event not found." }, { status: 404 });
        return NextResponse.json({ event });
      }
      case "create_destiny_event": {
        const event = await db.createDestinyEvent(userId, body.event);
        return NextResponse.json({ event });
      }
      case "update_destiny_event": {
        const eventId = String(body.eventId || body.event?.id || "");
        if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });
        const event = await db.updateDestinyEvent(userId, eventId, body.event);
        return NextResponse.json({ event });
      }
      case "delete_destiny_event": {
        const eventId = String(body.eventId || "");
        if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });
        await db.deleteDestinyEvent(userId, eventId);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Sovereign API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process Sovereign action." },
      { status: 500 }
    );
  }
}
