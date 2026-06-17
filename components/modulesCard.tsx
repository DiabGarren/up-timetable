export default function ModulesCard({
    modules,
    semester,
}: {
    modules: {
        code: string;
        sem: string;
        lang: string;
        activity: string;
        group: [
            { id: string; lessons: [{ sessionId: string; day: string; time: string; venue: string; campus: string }] },
        ];
    }[];
    semester: string;
}) {
    const mods: {
        code: string;
        sem: string;
        lang: string;
        activities: [
            {
                id: string;
                group: [
                    {
                        id: string;
                        lessons: [{ sessionId: string; day: string; time: string; venue: string; campus: string }];
                    },
                ];
            },
        ];
    }[] = [];
    modules.forEach((mod) => {
        if (mods.some((m) => m.code == mod.code)) {
            mods[mods.findIndex((m) => m.code == mod.code)].activities.push({ id: mod.activity, group: mod.group });
        } else {
            mods.push({
                code: mod.code,
                sem: mod.sem,
                lang: mod.lang,
                activities: [{ id: mod.activity, group: mod.group }],
            });
        }
    });

    return (
        <div className={`grid w-[85%] overflow-x-auto mx-auto my-4`} style={{gridTemplateColumns: `repeat(${mods.length}, 1fr)`}}>
            {mods.map((mod) => (
                <div key={mod.code} className="border w-[80px] h-[250px] overflow-y-auto">
                    <h2>{mod.code}</h2>
                    {mod.activities.map((act) => (
                        <div key={act.id}>
                            <h3>{act.id == "L" ? "Lectures" : act.id == "P" ? "Pracs" : "Tuts"}</h3>
                            <div>
                                {act.group.map((group) => (
                                    <div key={group.id}>
                                        <h4>{group.id}</h4>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
