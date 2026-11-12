import type { Metadata } from 'next';
import { InfoPage } from '@/components/info-page';
import { photoCredits } from '@/lib/photo-credits';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Photo credits',
    description: `Licences and authors for the product photographs on ${storeName()}.`,
  };
}

export default function Credits() {
  return (
    <InfoPage>
      <h1>Photo credits</h1>
      <p>
        Product photographs show the food itself, not a branded packet. Each file is stored with the
        shop and served from the catalogue. Cropped and resized copies stay under the same licence
        as the original.
      </p>
      <p>
        CC BY and CC BY-SA require this attribution. CC BY-SA also means adaptations of those
        photographs are shared under the same licence. CC0 and public-domain photographs do not
        require attribution; the source is listed anyway.
      </p>
      <div className="table-scroll">
        <table className="credits-table">
          <thead>
            <tr>
              <th>Photograph</th>
              <th>Used for</th>
              <th>Author</th>
              <th>Licence</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {photoCredits.map((credit) => (
              <tr key={credit.file}>
                <td>
                  <a href={credit.file}>{credit.file}</a>
                </td>
                <td>
                  {credit.usedFor}
                  <br />
                  <span className="credit-note">{credit.changes}</span>
                </td>
                <td>{credit.author}</td>
                <td>
                  <a href={credit.licenseUrl}>{credit.license}</a>
                </td>
                <td>
                  <a href={credit.sourceUrl}>{credit.sourceTitle}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoPage>
  );
}
