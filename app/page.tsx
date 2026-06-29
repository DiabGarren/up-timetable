"use client";

import { Button, ColorArea, ColorPicker, ColorSlider, Label, Radio, RadioGroup } from "@heroui/react";
import Image from "next/image";
import { useState } from "react";
import { extractText } from "unpdf";

function ConvertTime(time: string): number[] {
    const startH = parseInt(time.substring(0, 2)),
        startM = time.substring(3, 5) != "00" ? 30 : 0,
        endM = time.substring(11, 13) != "50" ? 30 : 0,
        endH = parseInt(time.substring(8, 10)) + (endM == 0 ? 1 : 0);

    const startIndex = startH - 7 + (startH - 7) - (startM == 0 ? 1 : 0),
        endIndex = endH - 7 + (endH - 7) - (endM == 0 ? 1 : 0) - 1;

    return [startIndex, endIndex];
}

function ConvertDay(day: string, DAYS: string[]): number {
    return DAYS.indexOf(day);
}
function InitialiseTable(): string[][] {
    const tempTable: string[][] = [];
    for (let r = 0; r < 20; r++) {
        const row: string[] = [];
        for (let c = 0; c < 5; c++) {
            row.push("");
        }
        tempTable.push(row);
    }
    return tempTable;
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
        colour: string;
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
                        disabled: boolean;
                    },
                ];
            },
        ];
    }

    const HEADER_REGEX = /^([A-Z]{2,4}\s\d{2,3})\s+(S\d)\s+([A-Z]+\d{1,3})\s+([A-Z])\s+([A-Z]{1,2})\s+(\S+)$/;
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const TIMES = [
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
    ];

    const COLOURS = [
        "#4745d5",
        "#8fe640",
        "#1d921e",
        "#e1833e",
        "#eae737",
        "#399cd6",
        "#51bcd6",
        "#e16bcb",
        "#d73230",
        "#935b4c",
        "#925bdd",
        "#e7b4ac",
        "#7c7c7c",
    ];

    const [semester, setSemester] = useState("S1");
    const [modules, setModules] = useState<
        | Lecture[]
        | {
              activities: {
                  group: {
                      selected: boolean;
                      disabled: boolean;
                      id: string;
                      lessons: [{ sessionId: string; day: string; time: string; venue: string; campus: string }];
                  }[];
                  id: string;
              }[];
              code: string;
              colour: string;
              sem: string;
              lang: string;
          }[]
    >([]);
    const [timetable, setTimetable] = useState<string[][]>(InitialiseTable());

    function clearTimetable() {
        setTimetable(InitialiseTable());
        const mods = modules.map((mod) => ({
            ...mod,
            activities: mod.activities.map((act) => ({
                ...act,
                group: act.group.map((g) => ({ ...g, selected: false, disabled: false })),
            })),
        }));
        setModules(mods);
    }

    /**
     * Converts hsl colour code to hexadecimal colour code.
     *
     * @param h - Hue value.
     * @param s - Saturation value.
     * @param l - Lightness value.
     * @returns Hexadecimal colour code.
     */

    function convertColour(h: number, s: number, l: number): string {
        const lDecimal = l / 100;
        const a = (s * Math.min(lDecimal, 1 - lDecimal)) / 100;

        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = lDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

            return Math.round(255 * color)
                .toString(16)
                .padStart(2, "0");
        };

        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function countSelected(
        activities: {
            group: {
                selected: boolean;
                disabled: boolean;
                id: string;
                lessons: [{ sessionId: string; day: string; time: string; venue: string; campus: string }];
            }[];
            id: string;
        }[],
    ) {
        let count = 0;
        activities.forEach((a) => {
            a.group.forEach((g) => {
                count += g.selected == true ? 1 : 0;
            });
        });

        return count;
    }

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
                                    let groups: [
                                        {
                                            id: string;
                                            lessons: [
                                                {
                                                    sessionId: string;
                                                    day: string;
                                                    time: string;
                                                    venue: string;
                                                    campus: string;
                                                },
                                            ];
                                            selected: boolean;
                                            disabled: boolean;
                                        },
                                    ];
                                    mod.group.forEach((group, index) => {
                                        if (index == 0)
                                            groups = [
                                                {
                                                    id: group.id,
                                                    lessons: group.lessons,
                                                    selected: false,
                                                    disabled: false,
                                                },
                                            ];
                                        else
                                            groups.push({
                                                id: group.id,
                                                lessons: group.lessons,
                                                selected: false,
                                                disabled: false,
                                            });
                                    });
                                    if (modsNew.some((m) => m.code == mod.code)) {
                                        modsNew[modsNew.findIndex((m) => m.code == mod.code)].activities.push({
                                            id: mod.activity,
                                            group: groups!,
                                        });
                                    } else {
                                        modsNew.push({
                                            code: mod.code,
                                            colour: COLOURS[
                                                modsNew.length >= COLOURS.length
                                                    ? modsNew.length - COLOURS.length
                                                    : modsNew.length
                                            ],
                                            sem: mod.sem,
                                            lang: mod.lang,
                                            activities: [{ id: mod.activity, group: groups! }],
                                        });
                                    }
                                });
                                setModules(modsNew);
                            })
                            .catch((err) => console.error(err));
                    }
                }}
            />

            <RadioGroup
                orientation="horizontal"
                value={semester}
                onChange={(value) => {
                    setSemester(value);
                    clearTimetable();
                }}>
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

            {modules.length > 0 ? (
                <div className="module-container">
                    {modules.map((mod, mIndex) =>
                        mod.sem == semester ? (
                            <div
                                key={mod.code + "-" + mIndex}
                                className="module-card border w-[120px] h-[250px] overflow-y-auto"
                                style={{
                                    backgroundColor:
                                        countSelected(mod.activities) == mod.activities.length ? "green" : "",
                                }}>
                                <div className="module-card-header" style={{ backgroundColor: mod.colour }}>
                                    <ColorPicker
                                        value={mod.colour}
                                        onChange={(value) => {
                                            const mods = modules.map((mod, index) => {
                                                return {
                                                    ...mod,
                                                    colour:
                                                        index == mIndex
                                                            ? convertColour(
                                                                  value.getChannelValue("hue"),
                                                                  value.getChannelValue("saturation"),
                                                                  value.getChannelValue("lightness"),
                                                              )
                                                            : mod.colour,
                                                };
                                            });
                                            setModules(mods);
                                        }}>
                                        <ColorPicker.Trigger>
                                            <h2>{mod.code}</h2>
                                            <Image
                                                src={"/color-picker-dropper.svg"}
                                                alt={"Colour picker"}
                                                objectFit={"cover"}
                                                width={25}
                                                height={25}
                                            />
                                        </ColorPicker.Trigger>
                                        <ColorPicker.Popover>
                                            <ColorArea colorSpace="hsl" xChannel="saturation" yChannel="lightness">
                                                <ColorArea.Thumb />
                                            </ColorArea>
                                            <ColorSlider channel="hue" colorSpace="hsl">
                                                <ColorSlider.Track>
                                                    <ColorSlider.Thumb />
                                                </ColorSlider.Track>
                                            </ColorSlider>
                                        </ColorPicker.Popover>
                                    </ColorPicker>
                                </div>

                                {mod.activities.map((act, aIndex) => (
                                    <RadioGroup
                                        key={mod.code + "-" + act.id + "-" + aIndex}
                                        value={
                                            act.group.findIndex((act) => act.selected == true) != -1
                                                ? act.group[act.group.findIndex((act) => act.selected == true)].id
                                                : null
                                        }
                                        onChange={(value) => {
                                            const lessons =
                                                act.group[act.group.findIndex((g) => g.id == value)].lessons;
                                            const tempTable = timetable.map((row) => [...row]);

                                            tempTable.forEach((row, rIndex) => {
                                                row.forEach((col, cIndex) => {
                                                    const code = col.substring(0, 7),
                                                        actId = col.substring(10, 11),
                                                        groupId = col.substring(14);
                                                    if (code == mod.code && actId == act.id && groupId != value)
                                                        tempTable[rIndex][cIndex] = "";
                                                });
                                            });

                                            lessons.forEach((lesson) => {
                                                for (
                                                    let i = ConvertTime(lesson.time)[0];
                                                    i <= ConvertTime(lesson.time)[1];
                                                    i++
                                                ) {
                                                    tempTable[i][ConvertDay(lesson.day, DAYS)] =
                                                        mod.code + " - " + act.id + " - " + value;
                                                }
                                            });

                                            const mods = modules.map((mod, mIdx) => {
                                                return {
                                                    ...mod,
                                                    activities: mod.activities.map((a, aIdx) => {
                                                        return {
                                                            ...a,
                                                            group: a.group.map((g) => {
                                                                if (mIdx == mIndex && aIdx == aIndex)
                                                                    return { ...g, selected: g.id == value };

                                                                let clash = false;
                                                                g.lessons.forEach((lesson) => {
                                                                    const startTime = ConvertTime(lesson.time)[0],
                                                                        endTime = ConvertTime(lesson.time)[1],
                                                                        day = ConvertDay(lesson.day, DAYS);

                                                                    for (
                                                                        let i = startTime;
                                                                        i <= endTime && !clash;
                                                                        i++
                                                                    ) {
                                                                        clash = tempTable[i][day] != "" && !g.selected;
                                                                    }
                                                                });
                                                                return { ...g, disabled: clash };
                                                            }),
                                                        };
                                                    }),
                                                };
                                            });
                                            setModules(mods);
                                            setTimetable(tempTable);
                                        }}>
                                        <Label>{act.id == "L" ? "Lectures" : act.id == "P" ? "Pracs" : "Tuts"}</Label>
                                        {act.group.map((group, gIndex) => (
                                            <Radio
                                                key={mod.code + "-" + act.id + "-" + group.id + "-" + gIndex}
                                                value={group.id}
                                                isDisabled={group.disabled}>
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
                            <div key={mod.code + "-" + mIndex} className="empty"></div>
                        ),
                    )}
                </div>
            ) : (
                <></>
            )}

            <div className="timetable">
                <div>
                    {TIMES.map((time) => (
                        <p key={time}>{time}</p>
                    ))}
                </div>
                <table>
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
                            <tr key={TIMES[index]}>
                                {day.map((cell, index) => (
                                    <td
                                        key={DAYS[index] + "-" + index}
                                        style={{
                                            backgroundColor:
                                                modules.length > 0
                                                    ? cell != ""
                                                        ? modules[
                                                              modules.findIndex((m) => m.code == cell.substring(0, 7))
                                                          ].colour
                                                        : ""
                                                    : "",
                                        }}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        <tr></tr>
                    </tbody>
                </table>
            </div>
            <Button
                onClick={() => {
                    clearTimetable();
                }}>
                Clear Timetable
            </Button>
        </main>
    );
}
