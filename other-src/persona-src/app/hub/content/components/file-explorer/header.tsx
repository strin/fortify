export default function Header() {
  return (
    <div className=" sticky top-0 z-10 flex min-w-min items-center border-b border-panel-border-light bg-panel-footer-light px-2.5 py-2 dark:border-panel-border-dark dark:bg-panel-footer-dark ">
      <div className="flex w-[50%] min-w-[250px] items-center">
        <div className="flex cursor-pointer leading-none -mt-0.5">
          <label className="text-scale-1100 cursor-pointer text-sm"></label>
        </div>
        <p className="text-sm">Name</p>
      </div>
      <p className="w-[15%] min-w-[100px] text-sm text-gray-400">Size</p>
      <p className="w-[30%] min-w-[160px] text-sm text-gray-400">
        Last modified at
      </p>
    </div>
  );
}
