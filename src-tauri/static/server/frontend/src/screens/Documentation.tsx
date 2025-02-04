import Title from "../components/common/Title";

const Documentation = () => {
    return (
        <div className="p-8 flex flex-1 bg-gray-50">
            <div className="flex flex-col flex-1">
                <main>
                    <Title title="Documentation" label="This page is shows some additional information on how the server's architecture was structured." />
                    <div className="py-6">
                        <p className="font-medium text-slate-500">The details of the server's implementation can be found on this github page: <a className="font-bold text-indigo-600" target="_blank" href="https://github.com/Rustbusters/server">Github</a></p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Documentation;
