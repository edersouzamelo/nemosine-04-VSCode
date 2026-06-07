import { notFound } from "next/navigation";
import { LEGAL_DOCUMENTS } from "../../../data/legalDocuments";
import LegalDocumentPage from "../../../components/LegalDocumentPage";
import { getLegalDocumentContent } from "../../../lib/legalContent";

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.flatMap((document) =>
    document.versions.map((version) => ({
      slug: document.slug,
      version: version.version,
    }))
  );
}

export default async function LegalDocumentVersionRoute({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}) {
  const { slug, version } = await params;
  const document = await getLegalDocumentContent(slug, version);

  if (!document) notFound();

  return <LegalDocumentPage document={document} />;
}
