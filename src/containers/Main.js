import React, { Component } from 'react';
import Title from './Title';
import Game from './Game';

const SCENE = {
    TITLE:  1,
    GAME:  2,
};

const initialState = {
    currentScene: SCENE.TITLE,
};

class Main extends Component {

    constructor(props) {
        super(props);
        this.state = initialState;
    }

    moveScene = (next) => {
        this.setState({
            ...this.state,
            currentScene: next,
        });
    };

    getCurrentContent = () => {
        switch(this.state.currentScene) {
            case SCENE.TITLE:
                return (
                    <Title
                        moveGame={() => this.moveScene(SCENE.GAME)}
                    />
                );
            case SCENE.GAME:
                return (
                    <Game
                        moveTitle={() => this.moveScene(SCENE.TITLE)}
                    />
                );
            default:
                return '';
        }
    }

    render() {
        return (
            <div className="Content">
                {this.getCurrentContent()}
            </div>
        );
    }

}

export default Main;
