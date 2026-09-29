import '../shared/style.css';
import { buildEntryUrl } from '../shared/entryLink';

const entryLink = document.querySelector<HTMLAnchorElement>('#entry-link')!;

// 開いた日以降の大会だけが表示されるよう、クリック時点の日付を入れる
const updateEntryLink = () => {
  entryLink.href = buildEntryUrl(new Date());
};
updateEntryLink();
entryLink.addEventListener('click', updateEntryLink);
