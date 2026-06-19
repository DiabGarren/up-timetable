"use client";

import { Label, Radio, RadioGroup } from "@heroui/react";
import { useState } from "react";
import { extractText } from "unpdf";

function ConvertTime(time: string): number[] {
    const startH = parseInt(time.substring(0, 2)),
        startM = time.substring(3, 5) != "00" ? 30 : 0,
        endH = parseInt(time.substring(8, 10)),
        endM = time.substring(11, 13) != "00" ? 30 : 0;
    const startIndex = startH - 7 + (startH - 7) - (startM == 0 ? 1 : 0),
        endIndex = endH - 7 + (endH - 7) - (endM == 0 ? 1 : 0);
    return [startIndex, endIndex];
}

function ConvertDay(day: string, DAYS: string[]): number {
    return DAYS.indexOf(day);
}

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
                        selected: boolean;
                    },
                ];
            },
        ];
    }

    const HEADER_REGEX = /^([A-Z]{2,4}\s\d{2,3})\s+(S\d)\s+([A-Z]+\d{1,3})\s+([A-Z])\s+([A-Z]{1,2})\s+(\S+)$/;
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const tempTable: string[][] = [];
    for (let r = 0; r < 21; r++) {
        const row: string[] = [];
        for (let c = 0; c < 5; c++) {
            row.push("");
        }
        tempTable.push(row);
    }

    const [semester, setSemester] = useState("S1");
    const [modules, setModules] = useState<Lecture[]>([]);
    const [timetable, setTimetable] = useState<string[][]>(tempTable);

    console.log(timetable);

    return (
        <main>
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
                                            group: [
                                                { id: mod.group[0].id, lessons: mod.group[0].lessons, selected: false },
                                            ],
                                        });
                                    } else {
                                        modsNew.push({
                                            code: mod.code,
                                            sem: mod.sem,
                                            lang: mod.lang,
                                            activities: [
                                                {
                                                    id: mod.activity,
                                                    group: [
                                                        {
                                                            id: mod.group[0].id,
                                                            lessons: mod.group[0].lessons,
                                                            selected: false,
                                                        },
                                                    ],
                                                },
                                            ],
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
                        Semester 1
                    </Radio.Content>
                </Radio>
                <Radio value="S2">
                    <Radio.Content>
                        <Radio.Control>
                            <Radio.Indicator />
                        </Radio.Control>
                        Semester 2
                    </Radio.Content>
                </Radio>
            </RadioGroup>

            <div className="module-container">
                {modules.map((mod) =>
                    mod.sem == semester ? (
                        <div key={mod.code} className="module-card border w-[120px] h-[250px] overflow-y-auto">
                            <h2>{mod.code}</h2>
                            {mod.activities.map((act) => (
                                <RadioGroup
                                    key={mod.code + "-" + act.id}
                                    onChange={(value) => {
                                        const group =
                                            mod.activities[0].group[
                                                mod.activities[0].group.findIndex((m) => m.id == value)
                                            ].lessons;

                                        const tempTable = timetable;
                                        group.forEach((lesson) => {
                                            for (
                                                let i = ConvertTime(lesson.time)[0];
                                                i <= ConvertTime(lesson.time)[1];
                                                i++
                                            ) {
                                                tempTable[i][ConvertDay(lesson.day, DAYS)] = mod.code;
                                            }
                                        });
                                        setTimetable(tempTable);
                                    }}>
                                    <Label>{act.id == "L" ? "Lectures" : act.id == "P" ? "Pracs" : "Tuts"}</Label>
                                    {act.group.map((group) => (
                                        <Radio key={mod.code + "-" + act.id + "-" + group.id} value={group.id}>
                                            <Radio.Content>
                                                <Radio.Control>
                                                    <Radio.Indicator />
                                                </Radio.Control>
                                                {group.id}
                                            </Radio.Content>
                                        </Radio>
                                    ))}
                                </RadioGroup>
                            ))}
                        </div>
                    ) : (
                        <></>
                    ),
                )}
            </div>
            <table className="timetable">
                <thead>
                    <tr>
                        <th>Monday</th>
                        <th>Tuesday</th>
                        <th>Wednesday</th>
                        <th>Thursday</th>
                        <th>Friday</th>
                    </tr>
                </thead>
                <tbody>
                    {timetable.map((day, index) => (
                        <tr key={DAYS[index]}>
                            {day.map((cell, index) => (
                                <td key={DAYS[index] + "-" + index}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
    );
}
