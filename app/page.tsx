"use client";

import { Label, Radio, RadioGroup } from "@heroui/react";
import { useState } from "react";
import { extractText } from "unpdf";

export default function Home() {
    interface Activity {
        code: string;
        sem: string;
        lang: string;
        activity: string;
        group: [
            { id: string; lessons: [{ sessionId: string; day: string; time: string; venue: string; campus: string }] },
        ];
    }
    interface Lecture {
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
    }
    const [modules, setModules] = useState<Lecture[]>([]);
    const HEADER_REGEX = /^([A-Z]{2,4}\s\d{2,3})\s+(S\d)\s+([A-Z]+\d{1,3})\s+([A-Z])\s+([A-Z]{1,2})\s+(\S+)$/;
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const [semester, setSemester] = useState("S1");

    return (
        <div>
            <input
                type="file"
                accept="application/pdf, .pdf"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        file.arrayBuffer()
                            .then((arrayBuffer) => Buffer.from(arrayBuffer))
                            .then((buffer) => extractText(buffer))
                            .then((result) => {
                                let i = 0;
                                const lines = result.text.join("\n").split("\n");

                                const mods: Activity[] = [];
                                while (i < lines.length) {
                                    const header = lines[i].match(HEADER_REGEX);
                                    if (!header) {
                                        // Groups that have only 1 lesson
                                        if (lines[i].substring(0, 21).match(HEADER_REGEX)) {
                                            const token = lines[i].split(" ");
                                            const campus = mods[0].group[0].lessons[0].campus;
                                            const venue = lines[i]
                                                .substring(
                                                    lines[i].indexOf(token[10]) + token[10].length,
                                                    lines[i].indexOf(campus),
                                                )
                                                .trim();

                                            const activity: Activity = {
                                                code: token[0] + " " + token[1],
                                                sem: token[2],
                                                lang: token[4],
                                                activity: token[5],
                                                group: [
                                                    {
                                                        id: token[3],
                                                        lessons: [
                                                            {
                                                                sessionId: token[6],
                                                                day: token[7],
                                                                time: token[8] + " " + token[9] + " " + token[10],
                                                                venue: venue,
                                                                campus: campus,
                                                            },
                                                        ],
                                                    },
                                                ],
                                            };
                                            if (
                                                mods.some(
                                                    (mod) =>
                                                        mod.code == activity.code && mod.activity == activity.activity,
                                                )
                                            ) {
                                                mods[
                                                    mods.findIndex(
                                                        (mod) =>
                                                            mod.code == activity.code &&
                                                            mod.activity == activity.activity,
                                                    )
                                                ].group.push(activity.group[0]);
                                            } else {
                                                mods.push(activity);
                                            }
                                        }
                                        i++;
                                        continue;
                                    }

                                    const activity: Activity = {
                                        code: header[1],
                                        sem: header[2],
                                        lang: header[4],
                                        activity: header[5],
                                        group: [
                                            {
                                                id: header[3],
                                                lessons: [
                                                    { sessionId: header[6], day: "", time: "", venue: "", campus: "" },
                                                ],
                                            },
                                        ],
                                    };
                                    i++;

                                    const sessions = [activity.group[0].lessons[0].sessionId];
                                    while (i < lines.length && !DAYS.includes(lines[i])) {
                                        sessions.push(lines[i]);
                                        i++;
                                    }
                                    const n = sessions.length;
                                    const campus = lines[i + 3 * n];
                                    for (let j = 0; j < sessions.length; j++) {
                                        activity.group[0].lessons[j] = {
                                            ...activity.group[0].lessons[j],
                                            sessionId: sessions[j],
                                            day: lines[i],
                                            time: lines[i + n],
                                            venue: lines[i + 2 * n],
                                            campus: campus,
                                        };
                                        i++;
                                    }
                                    i += 2 * n;
                                    i++;

                                    if (
                                        mods.some(
                                            (mod) => mod.code == activity.code && mod.activity == activity.activity,
                                        )
                                    ) {
                                        mods[
                                            mods.findIndex(
                                                (mod) => mod.code == activity.code && mod.activity == activity.activity,
                                            )
                                        ].group.push(activity.group[0]);
                                    } else {
                                        mods.push(activity);
                                    }
                                }

                                const modsNew: Lecture[] = [];

                                mods.forEach((mod) => {
                                    if (modsNew.some((m) => m.code == mod.code)) {
                                        modsNew[modsNew.findIndex((m) => m.code == mod.code)].activities.push({
                                            id: mod.activity,
                                            group: mod.group,
                                        });
                                    } else {
                                        modsNew.push({
                                            code: mod.code,
                                            sem: mod.sem,
                                            lang: mod.lang,
                                            activities: [{ id: mod.activity, group: mod.group }],
                                        });
                                    }
                                });
                                
                                setModules(modsNew);
                            })
                            .catch((err) => console.error(err));
                    }
                }}
            />

            <RadioGroup orientation="horizontal" value={semester} onChange={setSemester}>
                <Label />
                <Radio value="S1">
                    <Radio.Content>
                        <Radio.Control>
                            <Radio.Indicator />
                        </Radio.Control>
                    </Radio.Content>
                    Semester 1
                </Radio>
                <Radio value="S2">
                    <Radio.Content>
                        <Radio.Control>
                            <Radio.Indicator />
                        </Radio.Control>
                    </Radio.Content>
                    Semester 2
                </Radio>
            </RadioGroup>

            <div
                className={`module-container grid w-[85%] mx-auto my-4`}
                style={{ gridTemplateColumns: `repeat(${modules.length}, 1fr)` }}>
                {modules.map((mod) =>
                    mod.sem == semester ? (
                        <div key={mod.code} className="module-card border w-[120px] h-[250px] overflow-y-auto">
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
                    ) : (
                        <div key={mod.code}></div>
                    ),
                )}
            </div>
            <div className="grid grid-cols-5 gap-4 text-center w-[95%] mx-auto">
                <div>Monday</div>
                <div>Tuesday</div>
                <div>Wednesday</div>
                <div>Thursday</div>
                <div>Friday</div>
            </div>
        </div>
    );
}
