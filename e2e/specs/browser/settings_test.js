// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// TODO: fix test with new settings window

'use strict';

const fs = require('fs');

const {SHOW_SETTINGS_WINDOW} = require('../../../src/common/communication');

const env = require('../../modules/environment');
const {asyncSleep} = require('../../modules/utils');

describe('renderer/settings.html', function desc() {
    this.timeout(30000);

    const config = {
        version: 3,
        teams: [{
            name: 'example',
            url: env.mattermostURL,
            order: 0,
            tabs: [
                {
                    name: 'TAB_MESSAGING',
                    order: 0,
                    isOpen: true,
                },
                {
                    name: 'TAB_FOCALBOARD',
                    order: 1,
                    isOpen: true,
                },
                {
                    name: 'TAB_PLAYBOOKS',
                    order: 2,
                    isOpen: true,
                },
            ],
            lastActiveTab: 0,
        }, {
            name: 'github',
            url: 'https://github.com/',
            order: 1,
            tabs: [
                {
                    name: 'TAB_MESSAGING',
                    order: 0,
                    isOpen: true,
                },
                {
                    name: 'TAB_FOCALBOARD',
                    order: 1,
                    isOpen: true,
                },
                {
                    name: 'TAB_PLAYBOOKS',
                    order: 2,
                    isOpen: true,
                },
            ],
            lastActiveTab: 0,
        }],
        showTrayIcon: false,
        trayIconTheme: 'light',
        minimizeToTray: false,
        notifications: {
            flashWindow: 0,
            bounceIcon: false,
            bounceIconType: 'informational',
        },
        showUnreadBadge: true,
        useSpellChecker: true,
        enableHardwareAcceleration: true,
        autostart: true,
        darkMode: false,
        lastActiveTeam: 0,
        spellCheckerLocales: [],
    };

    beforeEach(async () => {
        env.createTestUserDataDir();
        env.cleanTestConfig();
        fs.writeFileSync(env.configFilePath, JSON.stringify(config));
        await asyncSleep(1000);
        this.app = await env.getApp();
    });

    afterEach(async () => {
        if (this.app) {
            await this.app.close();
        }
    });

    describe('Options', () => {
        describe('Start app on login', () => {
            it('should appear on win32 or linux', async () => {
                const expected = (process.platform === 'win32' || process.platform === 'linux');
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputAutoStart');
                existing.should.equal(expected);
            });
        });

        describe('Show icon in menu bar / notification area', () => {
            it('should appear on darwin or linux', async () => {
                const expected = (process.platform === 'darwin' || process.platform === 'linux');
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputShowTrayIcon');
                existing.should.equal(expected);
            });

            describe('Save tray icon setting on mac', () => {
                env.shouldTest(it, env.isOneOf(['darwin', 'linux']))('should be saved when it\'s selected', async () => {
                    this.app.evaluate(({ipcMain}, showWindow) => {
                        ipcMain.emit(showWindow);
                    }, SHOW_SETTINGS_WINDOW);
                    const settingsWindow = await this.app.waitForEvent('window', {
                        predicate: (window) => window.url().includes('settings'),
                    });
                    await settingsWindow.waitForSelector('.settingsPage.container');
                    await settingsWindow.click('#inputShowTrayIcon');
                    await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');

                    let config0 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                    config0.showTrayIcon.should.true;

                    await settingsWindow.click('#inputShowTrayIcon');
                    await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');

                    config0 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                    config0.showTrayIcon.should.false;
                });
            });

            describe('Save tray icon theme on linux', () => {
                env.shouldTest(it, process.platform === 'linux')('should be saved when it\'s selected', async () => {
                    this.app.evaluate(({ipcMain}, showWindow) => {
                        ipcMain.emit(showWindow);
                    }, SHOW_SETTINGS_WINDOW);
                    const settingsWindow = await this.app.waitForEvent('window', {
                        predicate: (window) => window.url().includes('settings'),
                    });
                    await settingsWindow.waitForSelector('.settingsPage.container');
                    await settingsWindow.click('#inputShowTrayIcon');
                    await settingsWindow.click('input[value="dark"]');
                    await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');

                    const config0 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                    config0.trayIconTheme.should.equal('dark');

                    await settingsWindow.click('input[value="light"]');
                    await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');

                    const config1 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                    config1.trayIconTheme.should.equal('light');
                });
            });
        });

        describe('Leave app running in notification area when application window is closed', () => {
            it('should appear on linux', async () => {
                const expected = (process.platform === 'linux');
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputMinimizeToTray');
                existing.should.equal(expected);
            });
        });

        describe('Flash app window and taskbar icon when a new message is received', () => {
            it('should appear on win32 and linux', async () => {
                const expected = (process.platform === 'win32' || process.platform === 'linux');
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputflashWindow');
                existing.should.equal(expected);
            });
        });

        describe('Show red badge on taskbar icon to indicate unread messages', () => {
            it('should appear on darwin or win32', async () => {
                const expected = (process.platform === 'darwin' || process.platform === 'win32');
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputShowUnreadBadge');
                existing.should.equal(expected);
            });
        });

        describe('Check spelling', () => {
            it('should appear and be selectable', async () => {
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const existing = await settingsWindow.isVisible('#inputSpellChecker');
                existing.should.equal(true);

                const selected = await settingsWindow.isChecked('#inputSpellChecker');
                selected.should.equal(true);

                await settingsWindow.click('#inputSpellChecker');
                await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');

                const config1 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                config1.useSpellChecker.should.equal(false);
            });
        });

        describe('Enable GPU hardware acceleration', () => {
            it('should save selected option', async () => {
                const ID_INPUT_ENABLE_HARDWARE_ACCELERATION = '#inputEnableHardwareAcceleration';
                this.app.evaluate(({ipcMain}, showWindow) => {
                    ipcMain.emit(showWindow);
                }, SHOW_SETTINGS_WINDOW);
                const settingsWindow = await this.app.waitForEvent('window', {
                    predicate: (window) => window.url().includes('settings'),
                });
                await settingsWindow.waitForSelector('.settingsPage.container');
                const selected = await settingsWindow.isChecked(ID_INPUT_ENABLE_HARDWARE_ACCELERATION);
                selected.should.equal(true); // default is true

                await settingsWindow.click(ID_INPUT_ENABLE_HARDWARE_ACCELERATION);
                await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');
                const config0 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                config0.enableHardwareAcceleration.should.equal(false);

                await settingsWindow.click(ID_INPUT_ENABLE_HARDWARE_ACCELERATION);
                await settingsWindow.waitForSelector('.IndicatorContainer :text("Saved")');
                const config1 = JSON.parse(fs.readFileSync(env.configFilePath, 'utf-8'));
                config1.enableHardwareAcceleration.should.equal(true);
            });
        });
    });
});
