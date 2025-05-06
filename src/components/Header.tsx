import Link from 'next/link';

const InfoHeader = () => {
  return (
    <header className="bg-gray-800 text-white p-4 grid grid-cols-3 items-center gap-3">
      <h1 className="text-2xl font-bold">My Application</h1>
      <ul className="flex flex-wrap gap-3">
        <Link href="/">Главная</Link>
        <Link href="/map">Карта парковок</Link>
        <Link href="/tariffs">Тарифы</Link>
        <Link href="/payments">Оплата</Link>
        <Link href="/contacts">Контакты</Link>
      </ul>
      <div className="flex justify-end">
        <Link className="bg-amber-300 text-black p-4 pt-2 pb-2 rounded-3xl" href="/login">
          Войти
        </Link>
      </div>
    </header>
  );
};

const MainHeader = () => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <h1 className="text-2xl font-bold">Main Header</h1>
    </header>
  );
};

export { InfoHeader, MainHeader };
